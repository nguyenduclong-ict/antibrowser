pub mod state;
pub mod server;
pub mod sidecar;
pub mod commands;

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use crate::state::AppState;
use crate::sidecar::{node_runtime, start_nodejs_sidecar};

async fn boot_sequence(app_handle: AppHandle, state: Arc<Mutex<AppState>>) {
    // 1. Khởi động Axum server trước để lấy port
    println!("[Tauri Boot] 1. Starting Axum server...");
    let bound_port = match server::start_axum_server(app_handle.clone(), state.clone()).await {
        Ok(port) => port,
        Err(e) => {
            let err_msg = format!("Error starting Axum server: {}", e);
            eprintln!("{}", err_msg);
            let _ = app_handle.emit("boot:status", err_msg);
            return;
        }
    };

    // Cập nhật port thực vào AppState
    {
        let mut app_state = state.lock().unwrap();
        app_state.tauri_port = bound_port;
    }

    // 2. Kiểm tra và tải Node.js portable
    println!("[Tauri Boot] 2. Checking/Downloading portable Node.js...");
    let _ = app_handle.emit("boot:status", "Preparing Node.js environment...");
    
    let node_bin = match node_runtime::setup_node_runtime(&app_handle).await {
        Ok(path) => path,
        Err(e) => {
            let err_msg = format!("Error preparing Node.js runtime: {}", e);
            eprintln!("{}", err_msg);
            let _ = app_handle.emit("boot:status", err_msg);
            return;
        }
    };

    // Cập nhật node_path vào AppState
    {
        let mut app_state = state.lock().unwrap();
        app_state.node_path = Some(node_bin.clone());
    }

    // 3. Khởi động sidecar Node.js
    println!("[Tauri Boot] 3. Starting Node.js sidecar...");
    let _ = app_handle.emit("boot:status", "Starting Node.js Sidecar...");
    
    if let Err(e) = start_nodejs_sidecar(app_handle.clone(), node_bin, bound_port, state.clone()).await {
        let err_msg = format!("Error starting sidecar: {}", e);
        eprintln!("{}", err_msg);
        let _ = app_handle.emit("boot:status", err_msg);
    }

    // 4. Ở chế độ DEV, khởi động watcher theo dõi file server.cjs để tự động restart sidecar
    #[cfg(dev)]
    {
        let app_clone = app_handle.clone();
        let state_clone = state.clone();
        tauri::async_runtime::spawn(async move {
            crate::sidecar::watch_server_js_changes(app_clone, state_clone).await;
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Khởi tạo state ban đầu với port giả định (sẽ cập nhật sau khi Axum start)
    let state = Arc::new(Mutex::new(AppState::new(0)));
    let state_setup = state.clone();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state.clone())
        .setup(move |app| {
            let app_handle = app.app_handle().clone();
            
            // Chạy boot sequence bất đồng bộ tránh block main thread
            tauri::async_runtime::spawn(async move {
                boot_sequence(app_handle, state_setup).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sidecars_status,
            commands::restart_sidecar
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Xử lý sự kiện thoát ứng dụng để dọn dẹp các processes sidecar
    let state_exit = state.clone();
    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            println!("[Tauri Exit] App exit. Cleaning up sidecars...");
            sidecar::kill_all_sidecars(state_exit.clone());
        }
    });
}
