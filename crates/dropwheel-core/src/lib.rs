//! Dropwheel's conversion engine.
//!
//! The UI asks [`actions_for`] which actions make sense for a file, shows them
//! on the wheel, and calls [`run`] with the action the user dropped the file on.
//! Results are written next to the source file and never overwrite anything.

mod docx;
mod image_ops;
mod output;
mod pdf;
mod pdf_input;

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
    #[error("could not read PDF: {0}")]
    Pdf(String),
    #[error("this PDF has no selectable text (is it a scan?)")]
    NoText,
    #[error(transparent)]
    Image(#[from] image::ImageError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),
}

pub type Result<T> = std::result::Result<T, Error>;

/// File formats the engine knows about.
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
    Txt,
    Docx,
}

impl Format {
    pub const ALL: [Format; 11] = [
        Format::Png,
        Format::Jpeg,
        Format::Webp,
        Format::Avif,
        Format::Tiff,
        Format::Bmp,
        Format::Gif,
        Format::Ico,
        Format::Pdf,
        Format::Txt,
        Format::Docx,
    ];

    /// What an image can be converted to.
    pub const IMAGE_TARGETS: [Format; 9] = [
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

    /// What a PDF can be converted to.
    pub const PDF_TARGETS: [Format; 4] = [Format::Docx, Format::Jpeg, Format::Png, Format::Txt];

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
            Format::Txt => "txt",
            Format::Docx => "docx",
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
            Format::Txt => "TXT",
            Format::Docx => "DOCX",
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
            "txt" => Format::Txt,
            "docx" => Format::Docx,
            _ => return None,
        })
    }

    fn targets(self) -> &'static [Format] {
        if self == Format::Pdf {
            &Self::PDF_TARGETS
        } else {
            &Self::IMAGE_TARGETS
        }
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
    // AVIF needs dav1d to decode; TXT and DOCX are output-only.
    (!matches!(format, Format::Avif | Format::Txt | Format::Docx)).then_some(format)
}

/// Actions available for `path`, in the order they should appear on the wheel.
/// Empty when the file type is not supported.
pub fn actions_for(path: &Path) -> Vec<ActionInfo> {
    let Some(input) = input_format(path) else {
        return Vec::new();
    };
    let mut actions: Vec<ActionInfo> = input
        .targets()
        .iter()
        .filter(|&&f| f != input)
        .map(|&f| ActionInfo {
            id: Action::Convert(f).id(),
            label: f.label().into(),
            group: Group::Convert,
        })
        .collect();
    if input == Format::Pdf {
        return actions;
    }
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

/// Runs `action` on `path` and returns the files it wrote: one, except for
/// multi-page PDFs converted to images, which produce one file per page.
pub fn run(path: &Path, action: Action) -> Result<Vec<PathBuf>> {
    let input =
        input_format(path).ok_or_else(|| Error::UnsupportedInput(path.display().to_string()))?;
    let unsupported = || Error::UnsupportedAction {
        action: action.id(),
    };
    if input == Format::Pdf {
        return match action {
            Action::Convert(target) if Format::PDF_TARGETS.contains(&target) => {
                pdf_input::convert(path, target)
            }
            _ => Err(unsupported()),
        };
    }
    match action {
        Action::Convert(target) if target == input || !Format::IMAGE_TARGETS.contains(&target) => {
            Err(unsupported())
        }
        Action::Convert(target) => {
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "", target.extension());
            image_ops::save(&img, target, &out, image_ops::Quality::High)?;
            Ok(vec![out])
        }
        Action::Compress => {
            if !image_ops::can_compress(input) {
                return Err(unsupported());
            }
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "-compressed", input.extension());
            image_ops::save(&img, input, &out, image_ops::Quality::Compressed)?;
            Ok(vec![out])
        }
        Action::StripMetadata => {
            // Re-encoding drops EXIF, GPS and XMP; orientation is baked into the pixels.
            let img = image_ops::open(path)?;
            let out = unique_output_path(path, "-clean", input.extension());
            image_ops::save(&img, input, &out, image_ops::Quality::High)?;
            Ok(vec![out])
        }
    }
}
