# Dropwheel

Open-source, cross-platform radial file converter. Drag a file, press **Shift**, and a wheel appears under the cursor: drop the file on a segment to convert it or run a tool. Hover the center to switch between **Convert** and **Tools**.

The result is saved next to the original (`photo.png` → `photo.jpg`, `photo (2).jpg`…). Nothing is ever overwritten.

## Status

Proof of concept. Image conversions work end to end; the drag + Shift trigger is tested on Linux (X11). macOS and Windows build in CI but still need hands-on testing.

| | Supported now |
|---|---|
| **Read** | PNG, JPG, WEBP, TIFF, BMP, GIF, ICO |
| **Write** | PNG, JPG, WEBP (lossless), AVIF, TIFF, BMP, GIF, ICO, PDF |
| **Tools** | Compress (JPG, PNG), Strip metadata (EXIF/GPS) |

## How it works

- **`crates/dropwheel-core`** (Rust): the conversion engine. `actions_for(path)` lists what the wheel should show; `run(path, action)` does the work.
- **`app/`** (Tauri 2 + TypeScript): a menu-bar/tray app with two windows, the transparent wheel overlay and the onboarding.
- **Trigger** (`app/src-tauri/src/trigger.rs`): polls the global mouse and keyboard state. When the left button is held, the cursor moved and Shift is down, the wheel pops up under the cursor and receives the drop through the regular OS drag-and-drop.

| Platform | Trigger | Notes |
|---|---|---|
| macOS | Global input polling | Needs the Accessibility permission, requested during onboarding |
| Windows | Global input polling | No permission needed |
| Linux (X11) | Global input polling | |
| Linux (Wayland) | Not yet | Wayland blocks global input monitoring; a portal shortcut is planned |
| iOS / iPadOS | Not yet | No system-wide drag on iOS; share extension planned |

## Development

Requirements: Rust (stable), Node 22, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```sh
cd app
npm install
npm run tauri dev      # run the app
npm run tauri build    # build an installer for your OS
cargo test --workspace # from the repo root
```

## Roadmap

1. ~~Proof of concept: drag + Shift, radial overlay, image conversions, onboarding.~~
2. PDF input (pdfium): PDF → JPG/PNG/TXT/DOCX, merge/split. HEIC and AVIF input.
3. Tools: crop, resize, remove background (ONNX model), redact, annotate.
4. Drag the result straight out of the wheel; settings (shortcut, output folder).
5. Wayland trigger, iOS share extension, signed releases and auto-update.

## License

[MIT](LICENSE)
