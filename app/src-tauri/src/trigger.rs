//! Watches for the "drag + Shift" gesture anywhere on screen.
//!
//! We poll the mouse and keyboard instead of hooking drag-and-drop in every
//! app: when the left button is held, the cursor has moved and Shift is down,
//! the user is (very likely) dragging something, so the wheel pops up under
//! the cursor. The wheel window then receives the drop through the regular OS
//! drag-and-drop machinery, which works the same on every platform.

use std::thread;
use std::time::Duration;

use device_query::{DeviceQuery, DeviceState, Keycode};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

use crate::permissions;

const POLL_INTERVAL: Duration = Duration::from_millis(16);
/// How far (in pixels) the cursor must travel with the button held to count as a drag.
const DRAG_THRESHOLD: i32 = 6;
/// Logical width and height of the overlay window (see tauri.conf.json).
const OVERLAY_SIZE: f64 = 380.0;

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let Some(device) = wait_for_device() else {
            eprintln!("dropwheel: global input is unavailable; the drag + Shift trigger is off");
            return;
        };
        let mut press_origin: Option<(i32, i32)> = None;
        let mut shown = false;

        loop {
            let mouse = device.get_mouse();
            let left_down = mouse.button_pressed.get(1).copied().unwrap_or(false);

            if left_down {
                let origin = *press_origin.get_or_insert(mouse.coords);
                if !shown && moved(origin, mouse.coords) && shift_down(&device) {
                    shown = true;
                    show_overlay(&app);
                }
            } else {
                press_origin = None;
                if shown {
                    shown = false;
                    let _ = app.emit_to("overlay", "trigger:release", ());
                }
            }
            thread::sleep(POLL_INTERVAL);
        }
    });
}

/// Blocks until the OS lets us read global input (after onboarding on macOS).
fn wait_for_device() -> Option<DeviceState> {
    loop {
        if permissions::granted() {
            // On Linux this fails without an X server (pure Wayland): give up.
            return DeviceState::checked_new();
        }
        thread::sleep(Duration::from_secs(1));
    }
}

fn moved(a: (i32, i32), b: (i32, i32)) -> bool {
    (a.0 - b.0).abs() > DRAG_THRESHOLD || (a.1 - b.1).abs() > DRAG_THRESHOLD
}

fn shift_down(device: &DeviceState) -> bool {
    device
        .get_keys()
        .iter()
        .any(|k| matches!(k, Keycode::LShift | Keycode::RShift))
}

/// Centers the wheel on the cursor and shows it.
pub fn show_overlay(app: &AppHandle) {
    let Some(window) = app.get_webview_window("overlay") else {
        return;
    };
    // Hidden windows may report a zero size (GTK), so use the configured one.
    if let (Ok(cursor), Ok(scale)) = (app.cursor_position(), window.scale_factor()) {
        let half = (OVERLAY_SIZE * scale / 2.0) as i32;
        let _ = window.set_position(PhysicalPosition::new(
            cursor.x as i32 - half,
            cursor.y as i32 - half,
        ));
    }
    let _ = window.show();
    let _ = app.emit_to("overlay", "overlay:show", ());
}
