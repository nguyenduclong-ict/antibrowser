pub mod node_runtime;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use crate::state::{AppState, SidecarEntry, SidecarStatus};

pub fn write_to_log_file(line: &str) {
    if let Some(home) = std::env::var_os("USERPROFILE") {
        let log_dir = std::path::Path::new(&home).join(".tauri-antidetect-browser");
        let _ = std::fs::create_dir_all(&log_dir);
        let log_file = log_dir.join("sidecar.log");
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file)
        {
            use std::io::Write;
            let _ = file.write_all(line.as_bytes());
        }
    }
}

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
        write_to_log_file(&format!("[ERROR] {}\n", err_msg));
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
    write_to_log_file("[Tauri Sidecar Manager] Node.js process spawned successfully!\n");
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
        write_to_log_file("[Tauri Sidecar Manager] Bắt đầu lắng nghe log của Node.js sidecar...\n");
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    print!("[Sidecar Node.js STDOUT] {}", line);
                    write_to_log_file(&format!("[STDOUT] {}", line));
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    eprint!("[Sidecar Node.js STDERR] {}", line);
                    write_to_log_file(&format!("[STDERR] {}", line));
                }
                CommandEvent::Terminated(status) => {
                    let term_msg = format!(
                        "[Tauri Sidecar Manager] Node.js sidecar terminated with exit code: {:?}\n",
                        status.code
                    );
                    println!("{}", term_msg);
                    write_to_log_file(&term_msg);
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

pub async fn restart_sidecar_process(
    app: AppHandle,
    state: Arc<Mutex<AppState>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 1. Kill old process
    {
        let mut app_state = state.lock().unwrap();
        if let Some(entry) = app_state.sidecars.get_mut("nodejs") {
            if let Some(child) = entry.process.take() {
                let _ = child.kill();
            }
            entry.status = SidecarStatus::Starting;
            entry.port = None;
        }
    }
    
    // 2. Lấy node_path và tauri_port từ state
    let (node_bin, tauri_port) = {
        let app_state = state.lock().unwrap();
        let bin = app_state.node_path.clone();
        (bin, app_state.tauri_port)
    };
    
    let node_bin_path = match node_bin {
        Some(path) => path,
        None => {
            node_runtime::get_node_bin_path(&app)
        }
    };
    
    // 3. Khởi động lại
    start_nodejs_sidecar(app, node_bin_path, tauri_port, state).await?;
    
    Ok(())
}

pub async fn watch_server_js_changes(app: AppHandle, state: Arc<Mutex<AppState>>) {
    use std::time::Duration;
    use tokio::time::sleep;

    let server_js = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("sidecar")
        .join("nodejs")
        .join("server.cjs");

    println!("[Sidecar Watcher] Bắt đầu theo dõi thay đổi của server.cjs tại: {:?}", server_js);

    let mut last_modified = std::fs::metadata(&server_js)
        .and_then(|m| m.modified())
        .ok();

    loop {
        sleep(Duration::from_millis(1000)).await;
        
        if let Ok(metadata) = std::fs::metadata(&server_js) {
            if let Ok(modified) = metadata.modified() {
                if Some(modified) != last_modified {
                    last_modified = Some(modified);
                    println!("[Sidecar Watcher] Phát hiện server.cjs thay đổi! Đang tự động restart sidecar...");
                    
                    let app_clone = app.clone();
                    let state_clone = state.clone();
                    if let Err(e) = restart_sidecar_process(app_clone, state_clone).await {
                        eprintln!("[Sidecar Watcher] Tự động restart sidecar thất bại: {}", e);
                    } else {
                        println!("[Sidecar Watcher] Tự động restart sidecar thành công!");
                    }
                }
            }
        }
    }
}
