use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::Serialize;
use tauri::{AppHandle, State};
use crate::state::{AppState, SidecarStatus};
use crate::sidecar::{start_nodejs_sidecar, node_runtime};

#[derive(Serialize)]
pub struct SidecarStatusResponse {
    pub name: String,
    pub port: Option<u16>,
    pub status: SidecarStatus,
}

#[tauri::command]
pub async fn get_sidecars_status(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<HashMap<String, SidecarStatusResponse>, String> {
    let app_state = state.lock().unwrap();
    let mut response = HashMap::new();
    
    for (name, entry) in &app_state.sidecars {
        response.insert(
            name.clone(),
            SidecarStatusResponse {
                name: entry.name.clone(),
                port: entry.port,
                status: entry.status.clone(),
            },
        );
    }
    
    Ok(response)
}

#[tauri::command]
pub async fn restart_sidecar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    name: String,
) -> Result<(), String> {
    if name != "nodejs" {
        return Err(format!("Sidecar '{}' không được hỗ trợ để restart", name));
    }
    
    // 1. Kill old process
    {
        let mut app_state = state.lock().unwrap();
        if let Some(entry) = app_state.sidecars.get_mut(&name) {
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
            // Nếu chưa có, tiến hành download lại
            node_runtime::get_node_bin_path(&app)
        }
    };
    
    // 3. Khởi động lại
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = start_nodejs_sidecar(app, node_bin_path, tauri_port, state_clone).await {
            eprintln!("[Tauri Commands] Khởi động lại sidecar thất bại: {}", e);
        }
    });
    
    Ok(())
}
