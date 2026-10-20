//! The wheel window: created once, shown under the cursor, dismissed after use.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

pub const LABEL: &str = "overlay";
/// Logical width and height of the window.
const SIZE: f64 = 380.0;
/// Where the window waits on Windows, far outside any monitor, shrunk to one
/// pixel so it's invisible and can't block clicks even if Windows moves it back.
#[cfg(windows)]
const PARKED: (f64, f64) = (-20000.0, -20000.0);
#[cfg(windows)]
const PARKED_SIZE: f64 = 1.0;

/// Set when a file is dropped on the wheel, so the release handler keeps it open.
static DROPPED: AtomicBool = AtomicBool::new(false);

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let builder = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("Dropwheel")
        .inner_size(SIZE, SIZE)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focused(false);

    // WebView2 hooks file drops into its child windows once, when the webview
    // is created, and a webview created hidden may not have them yet: drops are
    // then refused. So on Windows the wheel stays "visible", parked off-screen.
    #[cfg(windows)]
    let builder = builder
        .visible(true)
        .position(PARKED.0, PARKED.1)
        .inner_size(PARKED_SIZE, PARKED_SIZE);
    #[cfg(not(windows))]
    let builder = builder.visible(false);

    let window = builder.build()?;
    apply_glass(&window);
    // The builder's position isn't always honored for off-screen coordinates.
    #[cfg(windows)]
    park(&window);
    Ok(())
}

/// Blurs the desktop behind the wheel (Acrylic on Windows, vibrancy on macOS).
/// Linux has no such effect; there the wheel's CSS falls back to frosted fills.
fn apply_glass(window: &tauri::WebviewWindow) {
    #[cfg(any(windows, target_os = "macos"))]
    {
        use tauri::window::{Color, Effect, EffectState, EffectsBuilder};
        #[cfg(windows)]
        let effect = Effect::Acrylic;
        #[cfg(target_os = "macos")]
        let effect = Effect::HudWindow;
        let _ = window.set_effects(
            EffectsBuilder::new()
                .effect(effect)
                .state(EffectState::Active)
                // macOS: round the blur into a circle. Windows uses a window region instead.
                .radius(SIZE / 2.0)
                // Windows Acrylic tint: a faint warm white.
                .color(Color(255, 244, 236, 40))
                .build(),
        );
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    let _ = window;
}

/// Clips the window to a circle so the blur isn't square and the transparent
/// corners don't swallow clicks.
#[cfg(windows)]
fn clip_to_circle(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::Graphics::Gdi::{CreateEllipticRgn, SetWindowRgn};
    let (Ok(hwnd), Ok(scale)) = (window.hwnd(), window.scale_factor()) else {
        return;
    };
    let d = (SIZE * scale).round() as i32;
    // SAFETY: `hwnd` is our live window; on success the system owns the region.
    unsafe {
        let region = CreateEllipticRgn(0, 0, d + 1, d + 1);
        SetWindowRgn(hwnd.0 as _, region, 1);
    }
}

/// Centers the wheel on the cursor and shows it.
pub fn show_at_cursor(app: &AppHandle) {
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    DROPPED.store(false, Ordering::SeqCst);
    #[cfg(windows)]
    {
        let _ = window.set_size(tauri::LogicalSize::new(SIZE, SIZE));
        clip_to_circle(&window);
    }
    // Hidden windows may report a zero size (GTK), so use the configured one.
    if let (Ok(cursor), Ok(scale)) = (app.cursor_position(), window.scale_factor()) {
        let half = (SIZE * scale / 2.0) as i32;
        let _ = window.set_position(PhysicalPosition::new(
            cursor.x as i32 - half,
            cursor.y as i32 - half,
        ));
    }
    #[cfg(not(windows))]
    let _ = window.show();
    let _ = app.emit_to(LABEL, "overlay:show", ());
}

pub fn dismiss(app: &AppHandle) {
    DROPPED.store(false, Ordering::SeqCst);
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    #[cfg(windows)]
    park(&window);
    #[cfg(not(windows))]
    let _ = window.hide();
    let _ = app.emit_to(LABEL, "overlay:hide", ());
}

#[cfg(windows)]
fn park(window: &tauri::WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(PARKED_SIZE, PARKED_SIZE));
    let _ = window.set_position(tauri::LogicalPosition::new(PARKED.0, PARKED.1));
}

pub fn mark_dropped() {
    DROPPED.store(true, Ordering::SeqCst);
}

pub fn was_dropped() -> bool {
    DROPPED.load(Ordering::SeqCst)
}
