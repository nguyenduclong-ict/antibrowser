use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use axum::{
    extract::State,
    routing::put,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::state::{AppState, SidecarEntry, SidecarStatus, SidecarInfoPayload};

#[derive(Debug, Deserialize, Serialize)]
pub struct SidecarReadyRequest {
    pub name: String,
    pub port: u16,
}

pub struct ServerContext {
    pub app_handle: AppHandle,
    pub state: Arc<Mutex<AppState>>,
}

pub async fn start_axum_server(
    app_handle: AppHandle,
    state: Arc<Mutex<AppState>>,
) -> Result<u16, Box<dyn std::error::Error + Send + Sync>> {
    let context = Arc::new(ServerContext {
        app_handle,
        state: state.clone(),
    });

    let app = Router::new()
        .route("/api/sidecar/ready", put(handle_sidecar_ready))
        .with_state(context);

    // Bind port 0 để OS tự cấp cổng trống
    let addr = SocketAddr::from(([127, 0, 0, 1], 0));
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    let local_addr = listener.local_addr()?;
    let bound_port = local_addr.port();

    println!("[Tauri Axum Server] Running at http://{}", local_addr);

    // Spawn server chạy dưới background thread
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    Ok(bound_port)
}

async fn handle_sidecar_ready(
    State(ctx): State<Arc<ServerContext>>,
    Json(payload): Json<SidecarReadyRequest>,
) -> Json<serde_json::Value> {
    println!(
        "[Tauri Axum Server] Received ready registration from sidecar '{}' on port {}",
        payload.name, payload.port
    );

    let mut app_state = ctx.state.lock().unwrap();
    
    // Cập nhật trạng thái sidecar
    if let Some(entry) = app_state.sidecars.get_mut(&payload.name) {
        entry.port = Some(payload.port);
        entry.status = SidecarStatus::Ready;
    } else {
        // Nếu chưa được định nghĩa trước đó, ta tự insert luôn
        app_state.sidecars.insert(
            payload.name.clone(),
            SidecarEntry {
                name: payload.name.clone(),
                port: Some(payload.port),
                status: SidecarStatus::Ready,
                process: None,
            },
        );
    }

    // Emit event `sidecar:ready` lên frontend
    let info = SidecarInfoPayload {
        name: payload.name.clone(),
        port: payload.port,
    };
    if let Err(e) = ctx.app_handle.emit("sidecar:ready", &info) {
        eprintln!("[Tauri Axum Server] Cannot emit sidecar:ready event: {}", e);
    }

    // Kiểm tra xem tất cả các sidecar đã ready chưa
    // Hiện tại chỉ có sidecar "nodejs". Nhưng cấu trúc này cho phép mở rộng.
    let all_ready = app_state.sidecars.values().all(|s| match s.status {
        SidecarStatus::Ready => true,
        _ => false,
    });

    if all_ready {
        println!("[Tauri Axum Server] All sidecars are ready!");
        if let Err(e) = ctx.app_handle.emit("sidecar:all-ready", ()) {
            eprintln!("[Tauri Axum Server] Cannot emit sidecar:all-ready event: {}", e);
        }
    }

    Json(serde_json::json!({ "status": "acknowledged" }))
}
