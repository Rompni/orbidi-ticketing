use std::path::{Path, PathBuf};

use dropwheel_core::{actions_for, run, Action, Format, Group};
use image::{GenericImageView, Rgba, RgbaImage};

fn sample_png(dir: &Path) -> PathBuf {
    let img = RgbaImage::from_fn(40, 30, |x, y| {
        Rgba([
            (x * 6) as u8,
            (y * 8) as u8,
            128,
            if x < 20 { 255 } else { 0 },
        ])
    });
    let path = dir.join("sample.png");
    img.save(&path).unwrap();
    path
}

#[test]
fn png_converts_to_every_other_format() {
    let dir = tempfile::tempdir().unwrap();
    let src = sample_png(dir.path());

    for format in Format::ALL.into_iter().filter(|&f| f != Format::Png) {
        let out = run(&src, Action::Convert(format)).unwrap();
        assert_eq!(out.extension().unwrap(), format.extension());
        if format == Format::Pdf {
            let bytes = std::fs::read(&out).unwrap();
            assert!(bytes.starts_with(b"%PDF-1.4"));
            assert!(bytes.ends_with(b"%%EOF\n"));
        } else if format == Format::Avif {
            let bytes = std::fs::read(&out).unwrap();
            assert_eq!(&bytes[4..12], b"ftypavif");
        } else {
            let decoded = image::open(&out).unwrap_or_else(|e| panic!("{format:?}: {e}"));
            assert_eq!(decoded.dimensions(), (40, 30), "{format:?}");
        }
    }
}

#[test]
fn jpeg_output_flattens_transparency_onto_white() {
    let dir = tempfile::tempdir().unwrap();
    let src = sample_png(dir.path());
    let out = run(&src, Action::Convert(Format::Jpeg)).unwrap();
    let px = image::open(out).unwrap().to_rgb8().get_pixel(35, 15).0;
    assert!(
        px.iter().all(|&c| c > 240),
        "transparent area should be white, got {px:?}"
    );
}

#[test]
fn never_overwrites_existing_files() {
    let dir = tempfile::tempdir().unwrap();
    let src = sample_png(dir.path());
    let first = run(&src, Action::Convert(Format::Bmp)).unwrap();
    let second = run(&src, Action::Convert(Format::Bmp)).unwrap();
    assert_ne!(first, second);
    assert_eq!(second.file_name().unwrap(), "sample (2).bmp");
}

#[test]
fn strip_metadata_removes_exif() {
    let dir = tempfile::tempdir().unwrap();
    let src = sample_png(dir.path());
    let jpeg = run(&src, Action::Convert(Format::Jpeg)).unwrap();

    // Insert a minimal EXIF APP1 segment right after the SOI marker.
    let mut bytes = std::fs::read(&jpeg).unwrap();
    let tiff: &[u8] = b"II*\0\x08\0\0\0\0\0\0\0\0\0";
    let mut app1 = b"Exif\0\0".to_vec();
    app1.extend_from_slice(tiff);
    let len = (app1.len() + 2) as u16;
    let mut segment = vec![0xFF, 0xE1];
    segment.extend_from_slice(&len.to_be_bytes());
    segment.extend_from_slice(&app1);
    bytes.splice(2..2, segment);
    std::fs::write(&jpeg, &bytes).unwrap();

    let clean = run(&jpeg, Action::StripMetadata).unwrap();
    assert_eq!(clean.file_name().unwrap(), "sample-clean.jpg");
    let out = std::fs::read(clean).unwrap();
    assert!(!out.windows(6).any(|w| w == b"Exif\0\0"));
}

#[test]
fn actions_depend_on_input_type() {
    let png = actions_for(Path::new("a.png"));
    assert!(png.iter().all(|a| a.id != "convert:png"));
    assert!(png
        .iter()
        .any(|a| a.id == "convert:pdf" && a.group == Group::Convert));
    assert!(png
        .iter()
        .any(|a| a.id == "compress" && a.group == Group::Tools));

    assert!(actions_for(Path::new("b.bmp"))
        .iter()
        .all(|a| a.id != "compress"));
    assert!(actions_for(Path::new("notes.txt")).is_empty());
    assert!(actions_for(Path::new("photo.avif")).is_empty());
}

#[test]
fn action_ids_round_trip() {
    for format in Format::ALL {
        let action = Action::Convert(format);
        assert_eq!(Action::parse(&action.id()).unwrap(), action);
    }
    assert_eq!(Action::parse("compress").unwrap(), Action::Compress);
    assert!(Action::parse("convert:docx").is_err());
}
