//! OS permissions needed to watch the mouse and the Shift key system-wide.
//!
//! Only macOS gates this, behind the Accessibility permission. Linux on
//! Wayland can't do it at all: there the wheel needs another trigger.

use serde::Serialize;

#[derive(Serialize)]
pub struct PlatformInfo {
    pub os: &'static str,
    pub needs_permission: bool,
    /// Wayland blocks global input monitoring, so the drag + Shift gesture won't fire.
    pub wayland: bool,
}

pub fn platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS,
        needs_permission: cfg!(target_os = "macos"),
        wayland: cfg!(target_os = "linux") && std::env::var_os("WAYLAND_DISPLAY").is_some(),
    }
}

/// Checks the permission without showing any system prompt.
pub fn granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        macos_accessibility_client::accessibility::application_is_trusted()
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Shows the system prompt and opens the Accessibility pane in System Settings.
pub fn request() {
    #[cfg(target_os = "macos")]
    {
        if !macos_accessibility_client::accessibility::application_is_trusted_with_prompt() {
            let _ = tauri_plugin_opener::open_url(
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                None::<&str>,
            );
        }
    }
}
