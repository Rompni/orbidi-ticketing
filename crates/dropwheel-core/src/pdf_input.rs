//! Reading PDFs: rendering pages to images and extracting their text.

use std::panic::{self, AssertUnwindSafe};
use std::path::{Path, PathBuf};

use hayro::hayro_interpret::InterpreterSettings;
use hayro::hayro_syntax::Pdf;
use hayro::vello_cpu::color::palette::css::WHITE;
use hayro::{PixmapSettings, RenderCache, RenderSettings};
use image::{DynamicImage, RgbImage};

use crate::{docx, image_ops, unique_output_path, Error, Format, Result};

/// Render resolution: 3× the PDF's 72 dpi, i.e. 216 dpi.
const SCALE: f32 = 3.0;
/// Upper bound for the longest side of a rendered page, in pixels.
const MAX_SIDE: f32 = 6000.0;

pub fn convert(path: &Path, target: Format) -> Result<Vec<PathBuf>> {
    match target {
        Format::Txt => {
            let text = pages_text(path)?.join("\n\n");
            let out = unique_output_path(path, "", "txt");
            std::fs::write(&out, text)?;
            Ok(vec![out])
        }
        Format::Docx => {
            let pages = pages_text(path)?;
            let out = unique_output_path(path, "", "docx");
            docx::write(std::fs::File::create(&out)?, &pages)?;
            Ok(vec![out])
        }
        _ => {
            let pages = render_pages(path)?;
            let many = pages.len() > 1;
            pages
                .into_iter()
                .enumerate()
                .map(|(i, page)| {
                    // `doc.pdf` → `doc.png`, or `doc-1.png`, `doc-2.png`… for several pages.
                    let suffix = if many {
                        format!("-{}", i + 1)
                    } else {
                        String::new()
                    };
                    let out = unique_output_path(path, &suffix, target.extension());
                    image_ops::save(
                        &DynamicImage::ImageRgb8(page),
                        target,
                        &out,
                        image_ops::Quality::High,
                    )?;
                    Ok(out)
                })
                .collect()
        }
    }
}

fn render_pages(path: &Path) -> Result<Vec<RgbImage>> {
    let pdf = Pdf::new(std::fs::read(path)?).map_err(|e| Error::Pdf(format!("{e:?}")))?;
    let cache = RenderCache::new();
    let settings = InterpreterSettings::default();
    pdf.pages()
        .iter()
        .map(|page| {
            let (w, h) = page.render_dimensions();
            let scale = SCALE.min(MAX_SIDE / w.max(h).max(1.0));
            let pixmap = hayro::render(
                page,
                &cache,
                &settings,
                &RenderSettings::default(),
                &PixmapSettings {
                    x_scale: scale,
                    y_scale: scale,
                    bg_color: WHITE,
                },
            );
            // The background is opaque white, so premultiplied RGBA equals straight RGBA.
            let rgb: Vec<u8> = pixmap
                .data_as_u8_slice()
                .chunks_exact(4)
                .flat_map(|px| [px[0], px[1], px[2]])
                .collect();
            RgbImage::from_raw(pixmap.width().into(), pixmap.height().into(), rgb)
                .ok_or_else(|| Error::Pdf("rendered page has an unexpected size".into()))
        })
        .collect()
}

/// Text of each page. Fails with [`Error::NoText`] for image-only PDFs.
fn pages_text(path: &Path) -> Result<Vec<String>> {
    let bytes = std::fs::read(path)?;
    // pdf-extract can panic on malformed files; turn that into an error.
    let pages = panic::catch_unwind(AssertUnwindSafe(|| {
        pdf_extract::extract_text_from_mem_by_pages(&bytes)
    }))
    .map_err(|_| Error::Pdf("text extraction failed".into()))?
    .map_err(|e| Error::Pdf(e.to_string()))?;
    if pages.iter().all(|p| p.trim().is_empty()) {
        return Err(Error::NoText);
    }
    Ok(pages)
}
