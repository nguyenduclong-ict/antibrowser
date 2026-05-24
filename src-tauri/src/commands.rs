use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::Serialize;
use tauri::{AppHandle, State};
use crate::state::{AppState, SidecarStatus};


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
        return Err(format!("Sidecar '{}' is not supported for restart", name));
    }
    
    let state_inner = state.inner().clone();
    crate::sidecar::restart_sidecar_process(app, state_inner)
        .await
        .map_err(|e| e.to_string())
}
