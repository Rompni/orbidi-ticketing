# Dropwheel

Open-source, cross-platform radial file converter. Drag a file, press **Shift**, and a radial menu appears under the cursor: drop the file on a segment to convert it (PDF → DOCX/TXT/JPG/PNG, images ↔ PNG/WEBP/HEIC/AVIF/TIFF/BMP/PDF) or run a tool (compress, strip metadata, crop, redact, annotate, remove background).

## Status

Planning. Nothing to install yet.

## Planned architecture

- **Core (Rust):** all conversions and tools, shared across platforms.
- **UI (Tauri 2):** radial overlay, onboarding and settings.
- **Platform modules:** global drag + modifier detection per OS.

| Platform | Trigger | Notes |
|---|---|---|
| macOS | Global event monitor + drag pasteboard | Needs Accessibility permission (requested during onboarding) |
| Windows | Low-level mouse/keyboard hooks | No permission needed |
| Linux (X11) | XInput2 | |
| Linux (Wayland) | Global shortcut via desktop portal | Wayland blocks global input monitoring |
| iOS / iPadOS | Share extension + drop onto app in Split View | No system-wide drag on iOS |

## Roadmap

1. Proof of concept: drag + Shift detection, radial overlay, image conversions.
2. MVP: PDF conversions, compress, strip metadata, crop, onboarding, settings.
3. Advanced tools: remove background, redact, annotate, batch, video/audio.
4. Packaging: signed builds, auto-update, iOS share extension.

## License

MIT
