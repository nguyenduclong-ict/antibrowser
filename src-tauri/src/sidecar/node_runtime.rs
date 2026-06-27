use std::fs::{self, File};
use std::io::{self, Cursor};
use std::path::{Path, PathBuf};
use futures_util::StreamExt;
use reqwest::Client;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

const NODE_VERSION: &str = "24.0.0";

#[derive(Debug, Clone, Serialize)]
#[allow(dead_code)]
struct ProgressPayload {
    stage: String,
    percent: f64,
}

pub fn get_node_bin_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Cannot get app data directory");
    
    #[cfg(target_os = "windows")]
    {
        app_dir.join("node").join(format!("node-v{}-win-x64", NODE_VERSION)).join("node.exe")
    }
    #[cfg(target_os = "macos")]
    {
        // Kiểm tra xem arm64 hay x64
        #[cfg(target_arch = "aarch64")]
        let folder = format!("node-v{}-darwin-arm64", NODE_VERSION);
        #[cfg(not(target_arch = "aarch64"))]
        let folder = format!("node-v{}-darwin-x64", NODE_VERSION);
        
        app_dir.join("node").join(folder).join("bin").join("node")
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        app_dir.join("node").join(format!("node-v{}-linux-x64", NODE_VERSION)).join("bin").join("node")
    }
}

pub async fn setup_node_runtime(app_handle: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(dev)]
    {
        println!("[Tauri Node Runtime] Running in DEV mode. Using system Node.js.");
        let _ = app_handle.emit("boot:status", "DEV Mode: Using system Node.js...");
        
        #[cfg(target_os = "windows")]
        return Ok(PathBuf::from("node.exe"));
        #[cfg(not(target_os = "windows"))]
        return Ok(PathBuf::from("node"));
    }

    #[cfg(not(dev))]
    {
        let node_bin = get_node_bin_path(app_handle);
        
        if node_bin.exists() {
            println!("[Tauri Node Runtime] Node.js already exists at: {:?}", node_bin);
            return Ok(node_bin);
        }
        
        println!("[Tauri Node Runtime] Node.js is not installed. Downloading...");
        
        let app_dir = app_handle.path().app_data_dir()?;
        let node_dir = app_dir.join("node");
        fs::create_dir_all(&node_dir)?;

        // 1. Xác định download URL
        let url = get_download_url()?;
        let filename = url.split('/').last().unwrap_or("node.archive");
        let archive_path = node_dir.join(filename);
        
        // 2. Tải file với progress reporting
        download_file_with_progress(app_handle, &url, &archive_path).await?;
        
        // 3. Giải nén
        extract_archive(app_handle, &archive_path, &node_dir)?;
        
        // 4. Xóa file nén sau khi giải nén xong để dọn dẹp
        let _ = fs::remove_file(archive_path);
        
        if node_bin.exists() {
            println!("[Tauri Node Runtime] Node.js installed successfully! Bin path: {:?}", node_bin);
            Ok(node_bin)
        } else {
            Err(format!("Installed successfully but executable file not found at {:?}", node_bin).into())
        }
    }
}

#[allow(dead_code)]
fn get_download_url() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    {
        Ok(format!(
            "https://nodejs.org/dist/v{}/node-v{}-win-x64.zip",
            NODE_VERSION, NODE_VERSION
        ))
    }
    #[cfg(target_os = "macos")]
    {
        #[cfg(target_arch = "aarch64")]
        let arch_str = "darwin-arm64";
        #[cfg(not(target_arch = "aarch64"))]
        let arch_str = "darwin-x64";
        
        Ok(format!(
            "https://nodejs.org/dist/v{}/node-v{}-{}.tar.gz",
            NODE_VERSION, NODE_VERSION, arch_str
        ))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        // Linux
        Ok(format!(
            "https://nodejs.org/dist/v{}/node-v{}-linux-x64.tar.gz",
            NODE_VERSION, NODE_VERSION
        ))
    }
}

#[allow(dead_code)]
async fn download_file_with_progress(
    app_handle: &AppHandle,
    url: &str,
    output_path: &Path,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::new();
    let res = client.get(url).send().await?;
    let total_size = res.content_length().ok_or("Cannot get file size")?;
    
    let mut file = File::create(output_path)?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    
    println!("[Tauri Node Runtime] Starting download, total size: {} MB", total_size as f64 / 1_048_576.0);
    
    while let Some(item) = stream.next().await {
        let chunk = item?;
        io::copy(&mut Cursor::new(&chunk), &mut file)?;
        downloaded += chunk.len() as u64;
        
        let percent = (downloaded as f64 / total_size as f64) * 100.0;
        app_handle.emit("boot:status", format!("Downloading Node.js environment: {:.1}%", percent))?;
    }
    
    app_handle.emit("boot:status", "Node.js download completed. Extracting...")?;
    Ok(())
}

#[allow(dead_code)]
fn extract_archive(
    app_handle: &AppHandle,
    archive_path: &Path,
    dest_dir: &Path,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let extension = archive_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
        
    println!("[Tauri Node Runtime] Extracting file: {:?} to {:?}", archive_path, dest_dir);
    
    if extension == "zip" {
        // Giải nén file .zip (Windows)
        let file = File::open(archive_path)?;
        let mut archive = zip::ZipArchive::new(file)?;
        
        let total_files = archive.len();
        for i in 0..total_files {
            let mut file = archive.by_index(i)?;
            let outpath = match file.enclosed_name() {
                Some(path) => dest_dir.join(path),
                None => continue,
            };
            
            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = File::create(&outpath)?;
                io::copy(&mut file, &mut outfile)?;
            }
            
            if i % 50 == 0 {
                let percent = (i as f64 / total_files as f64) * 100.0;
                let _ = app_handle.emit("boot:status", format!("Extracting: {:.1}%", percent));
            }
        }
    } else if extension == "gz" {
        // Giải nén file .tar.gz (macOS & Linux)
        let tar_gz_file = File::open(archive_path)?;
        let tar_file = flate2::read::GzDecoder::new(tar_gz_file);
        let mut archive = tar::Archive::new(tar_file);
        
        // Giải nén tất cả
        archive.unpack(dest_dir)?;
    } else {
        return Err(format!("Archive format not supported: {}", extension).into());
    }
    
    Ok(())
}
