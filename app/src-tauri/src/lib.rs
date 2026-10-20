mod overlay;
mod permissions;
mod settings;
mod trigger;

use std::path::PathBuf;

use dropwheel_core::{Action, ActionInfo};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, DragDropEvent, Manager, WindowEvent};

#[tauri::command]
fn actions_for(path: PathBuf) -> Vec<ActionInfo> {
    dropwheel_core::actions_for(&path)
}

#[tauri::command]
async fn run_action(path: PathBuf, action: String) -> Result<Vec<PathBuf>, String> {
    let action = Action::parse(&action).map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || dropwheel_core::run(&path, action))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal(path: PathBuf) -> Result<(), String> {
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn hide_overlay(app: AppHandle) {
    overlay::dismiss(&app);
}

#[tauri::command]
fn platform_info() -> permissions::PlatformInfo {
    permissions::platform_info()
}

#[tauri::command]
fn permission_granted() -> bool {
    permissions::granted()
}

#[tauri::command]
fn request_permission() {
    permissions::request();
}

#[tauri::command]
fn finish_onboarding(app: AppHandle) -> Result<(), String> {
    let mut s = settings::load(&app);
    s.onboarding_done = true;
    settings::save(&app, &s).map_err(|e| e.to_string())?;
    if let Some(w) = app.get_webview_window("onboarding") {
        let _ = w.hide();
    }
    Ok(())
}

fn show_onboarding(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("onboarding") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            actions_for,
            run_action,
            reveal,
            hide_overlay,
            platform_info,
            permission_granted,
            request_permission,
            finish_onboarding,
        ])
        .setup(|app| {
            // Menu bar app: no Dock icon.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handle = app.handle();
            overlay::create(handle)?;
            let setup = MenuItem::with_id(handle, "setup", "Setup…", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "Quit Dropwheel", true, None::<&str>)?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("Dropwheel")
                .menu(&Menu::with_items(handle, &[&setup, &quit])?)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "setup" => show_onboarding(app),
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            if !settings::load(handle).onboarding_done || !permissions::granted() {
                show_onboarding(handle);
            }
            trigger::spawn(handle.clone());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Windows live for the whole session; closing one only hides it.
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::DragDrop(drag) if window.label() == overlay::LABEL => {
                #[cfg(debug_assertions)]
                eprintln!("dropwheel: {drag:?}");
                if let DragDropEvent::Drop { .. } = drag {
                    overlay::mark_dropped();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running Dropwheel");
}
