pub mod node_runtime;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use crate::state::{AppState, SidecarEntry, SidecarStatus};

pub async fn start_nodejs_sidecar(
    app_handle: AppHandle,
    node_bin: PathBuf,
    tauri_port: u16,
    state: Arc<Mutex<AppState>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("[Tauri Sidecar Manager] Spawning Node.js sidecar...");
    
    // 1. Xác định bundle path của server.cjs động theo chế độ DEV hay PRODUCTION
    #[cfg(dev)]
    let server_js = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("sidecar")
        .join("nodejs")
        .join("server.cjs");

    #[cfg(not(dev))]
    let server_js = app_handle
        .path()
        .resource_dir()
        .expect("Cannot get resource directory")
        .join("resources")
        .join("sidecar")
        .join("nodejs")
        .join("server.cjs");
        
    println!("[Tauri Sidecar Manager] File server.cjs path: {:?}", server_js);

    if !server_js.exists() {
        let err_msg = format!("Cannot find bundle file server.cjs at: {:?}", server_js);
        eprintln!("{}", err_msg);
        return Err(err_msg.into());
    }

    // 2. Cập nhật state sidecar sang Starting
    {
        let mut app_state = state.lock().unwrap();
        app_state.sidecars.insert(
            "nodejs".to_string(),
            SidecarEntry {
                name: "nodejs".to_string(),
                port: None,
                status: SidecarStatus::Starting,
                process: None,
            },
        );
    }

    // Gửi thông báo đến UI
    app_handle.emit("boot:status", "Starting Node.js sidecar...")?;

    // 3. Spawn Node.js process sử dụng tauri-plugin-shell
    // Chạy lệnh: node.exe path/to/server.js --tauri-port=XXXX
    let shell = app_handle.shell();
    let command = shell
        .command(node_bin)
        .args(&[
            server_js.to_string_lossy().to_string(),
            format!("--tauri-port={}", tauri_port),
        ]);
        
    let (mut rx, child) = command.spawn()?;
    println!("[Tauri Sidecar Manager] Node.js process spawned successfully!");

    // Lưu child process handle vào state để có thể kill sau này
    {
        let mut app_state = state.lock().unwrap();
        if let Some(entry) = app_state.sidecars.get_mut("nodejs") {
            entry.process = Some(child);
        }
    }

    // Lắng nghe stdout/stderr từ sidecar process để ghi log
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    print!("[Sidecar Node.js STDOUT] {}", line);
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    eprint!("[Sidecar Node.js STDERR] {}", line);
                }
                CommandEvent::Terminated(status) => {
                    println!(
                        "[Tauri Sidecar Manager] Node.js sidecar terminated with exit code: {:?}",
                        status.code
                    );
                }
                _ => {}
            }
        }
    });

    Ok(())
}

pub fn kill_all_sidecars(state: Arc<Mutex<AppState>>) {
    println!("[Tauri Sidecar Manager] Stopping all sidecars...");
    let mut app_state = state.lock().unwrap();
    
    for (name, entry) in app_state.sidecars.iter_mut() {
        if let Some(child) = entry.process.take() {
            println!("[Tauri Sidecar Manager] Killing sidecar process: {}", name);
            let _ = child.kill();
            entry.status = SidecarStatus::Stopped;
        }
    }
}
