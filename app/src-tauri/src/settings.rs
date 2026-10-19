use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default)]
    pub onboarding_done: bool,
}

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("settings.json"))
}

pub fn load(app: &AppHandle) -> Settings {
    path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &AppHandle, settings: &Settings) -> std::io::Result<()> {
    let path = path(app).ok_or_else(|| std::io::Error::other("no config directory"))?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    fs::write(path, serde_json::to_string_pretty(settings)?)
}
