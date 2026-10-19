//! Dropwheel's conversion engine.
//!
//! The UI asks [`actions_for`] which actions make sense for a file, shows them
//! on the wheel, and calls [`run`] with the action the user dropped the file on.
//! Results are written next to the source file and never overwrite anything.

mod image_ops;
mod output;
mod pdf;

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub use output::unique_output_path;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("unsupported file type: {0}")]
    UnsupportedInput(String),
    #[error("action `{action}` is not available for this file")]
    UnsupportedAction { action: String },
    #[error("unknown action `{0}`")]
    UnknownAction(String),
    #[error(transparent)]
    Image(#[from] image::ImageError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Output formats the engine can write.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Png,
    Jpeg,
    Webp,
    Avif,
    Tiff,
    Bmp,
    Gif,
    Ico,
    Pdf,
}

impl Format {
    pub const ALL: [Format; 9] = [
        Format::Png,
        Format::Jpeg,
        Format::Webp,
        Format::Avif,
        Format::Tiff,
        Format::Bmp,
        Format::Gif,
        Format::Ico,
        Format::Pdf,
    ];

    pub fn extension(self) -> &'static str {
        match self {
            Format::Png => "png",
            Format::Jpeg => "jpg",
            Format::Webp => "webp",
            Format::Avif => "avif",
            Format::Tiff => "tiff",
            Format::Bmp => "bmp",
            Format::Gif => "gif",
            Format::Ico => "ico",
            Format::Pdf => "pdf",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Format::Png => "PNG",
            Format::Jpeg => "JPG",
            Format::Webp => "WEBP",
            Format::Avif => "AVIF",
            Format::Tiff => "TIFF",
            Format::Bmp => "BMP",
            Format::Gif => "GIF",
            Format::Ico => "ICO",
            Format::Pdf => "PDF",
        }
    }

    fn from_extension(ext: &str) -> Option<Format> {
        Some(match ext.to_ascii_lowercase().as_str() {
            "png" => Format::Png,
            "jpg" | "jpeg" => Format::Jpeg,
            "webp" => Format::Webp,
            "avif" => Format::Avif,
            "tif" | "tiff" => Format::Tiff,
            "bmp" => Format::Bmp,
            "gif" => Format::Gif,
            "ico" => Format::Ico,
            "pdf" => Format::Pdf,
            _ => return None,
        })
    }
}

/// Something the user can drop a file on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "format", rename_all = "snake_case")]
pub enum Action {
    Convert(Format),
    Compress,
    StripMetadata,
}

impl Action {
    /// Stable identifier used by the UI, e.g. `convert:png` or `compress`.
    pub fn id(self) -> String {
        match self {
            Action::Convert(f) => format!("convert:{}", f.extension()),
            Action::Compress => "compress".into(),
            Action::StripMetadata => "strip_metadata".into(),
        }
    }

    pub fn parse(id: &str) -> Result<Action> {
        match id {
            "compress" => Ok(Action::Compress),
            "strip_metadata" => Ok(Action::StripMetadata),
            _ => id
                .strip_prefix("convert:")
                .and_then(Format::from_extension)
                .map(Action::Convert)
                .ok_or_else(|| Error::UnknownAction(id.into())),
        }
    }
}

/// Which ring of the wheel an action belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Group {
    Convert,
    Tools,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActionInfo {
    pub id: String,
    pub label: String,
    pub group: Group,
}

/// The input formats the engine can read.
pub fn input_format(path: &Path) -> Option<Format> {
    let format = path
        .extension()
        .and_then(|e| e.to_str())
        .and_then(Format::from_extension)?;
    // PDF and AVIF are output-only for now: reading them needs pdfium / dav1d.
    (!matches!(format, Format::Pdf | Format::Avif)).then_some(format)
}

/// Actions available for `path`, in the order they should appear on the wheel.
/// Empty when the file type is not supported.
pub fn actions_for(path: &Path) -> Vec<ActionInfo> {
    let Some(input) = input_format(path) else {
        return Vec::new();
    };
    let mut actions: Vec<ActionInfo> = Format::ALL
        .into_iter()
        .filter(|&f| f != input)
        .map(|f| ActionInfo {
            id: Action::Convert(f).id(),
            label: f.label().into(),
            group: Group::Convert,
        })
        .collect();
    if image_ops::can_compress(input) {
        actions.push(ActionInfo {
            id: Action::Compress.id(),
            label: "Compress".into(),
            group: Group::Tools,
        });
    }
    actions.push(ActionInfo {
        id: Action::StripMetadata.id(),
        label: "Strip metadata".into(),
        group: Group::Tools,
    });
    actions
}

/// Runs `action` on `path` and returns the path of the file it wrote.
pub fn run(path: &Path, action: Action) -> Result<PathBuf> {
    let input =
        input_format(path).ok_or_else(|| Error::UnsupportedInput(path.display().to_string()))?;
    match action {
        Action::Convert(target) if target == input => Err(Error::UnsupportedAction {
            action: action.id(),
        }),
        Action::Convert(target) => {
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "", target.extension());
            image_ops::save(&img, target, &out, image_ops::Quality::High)?;
            Ok(out)
        }
        Action::Compress => {
            if !image_ops::can_compress(input) {
                return Err(Error::UnsupportedAction {
                    action: action.id(),
                });
            }
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "-compressed", input.extension());
            image_ops::save(&img, input, &out, image_ops::Quality::Compressed)?;
            Ok(out)
        }
        Action::StripMetadata => {
            // Re-encoding drops EXIF, GPS and XMP; orientation is baked into the pixels.
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "-clean", input.extension());
            image_ops::save(&img, input, &out, image_ops::Quality::High)?;
            Ok(out)
        }
    }
}
