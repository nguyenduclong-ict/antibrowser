use std::collections::HashMap;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use tauri_plugin_shell::process::CommandChild;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SidecarStatus {
    Starting,
    Ready,
    Failed(String),
    Stopped,
}

pub struct SidecarEntry {
    pub name: String,
    pub port: Option<u16>,
    pub status: SidecarStatus,
    pub process: Option<CommandChild>,
}

pub struct AppState {
    pub tauri_port: u16,
    pub sidecars: HashMap<String, SidecarEntry>,
    pub node_path: Option<PathBuf>,
}

impl AppState {
    pub fn new(tauri_port: u16) -> Self {
        Self {
            tauri_port,
            sidecars: HashMap::new(),
            node_path: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarInfoPayload {
    pub name: String,
    pub port: u16,
}
