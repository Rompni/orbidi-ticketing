use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

use image::codecs::{avif::AvifEncoder, jpeg::JpegEncoder, png};
use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader, Rgb, RgbImage};

use crate::{pdf, Error, Format, Result};

#[derive(Debug, Clone, Copy)]
pub enum Quality {
    High,
    Compressed,
}

/// Decodes an image and applies its EXIF orientation so the pixels are upright.
pub fn open(path: &Path) -> Result<DynamicImage> {
    let mut decoder = ImageReader::open(path)?
        .with_guessed_format()?
        .into_decoder()?;
    let orientation = decoder.orientation()?;
    let mut img = DynamicImage::from_decoder(decoder)?;
    img.apply_orientation(orientation);
    Ok(img)
}

pub fn can_compress(format: Format) -> bool {
    matches!(format, Format::Jpeg | Format::Png)
}

pub fn save(img: &DynamicImage, format: Format, out: &Path, quality: Quality) -> Result<()> {
    if matches!(format, Format::Txt | Format::Docx) {
        return Err(Error::UnsupportedAction {
            action: format!("convert:{}", format.extension()),
        });
    }
    let mut w = BufWriter::new(File::create(out)?);
    match format {
        Format::Jpeg => {
            let q = match quality {
                Quality::High => 92,
                Quality::Compressed => 70,
            };
            JpegEncoder::new_with_quality(&mut w, q).encode_image(&flatten(img))?;
        }
        Format::Png => {
            let compression = match quality {
                Quality::High => png::CompressionType::Default,
                Quality::Compressed => png::CompressionType::Best,
            };
            let encoder =
                png::PngEncoder::new_with_quality(&mut w, compression, png::FilterType::Adaptive);
            img.write_with_encoder(encoder)?;
        }
        Format::Avif => {
            let q = match quality {
                Quality::High => 85,
                Quality::Compressed => 60,
            };
            img.write_with_encoder(AvifEncoder::new_with_speed_quality(&mut w, 6, q))?;
        }
        Format::Ico => {
            // ICO entries are at most 256×256.
            let icon = if img.width() > 256 || img.height() > 256 {
                img.resize(256, 256, FilterType::Lanczos3)
            } else {
                img.clone()
            };
            icon.write_to(&mut w, ImageFormat::Ico)?;
        }
        Format::Pdf => {
            let mut jpeg = Vec::new();
            JpegEncoder::new_with_quality(&mut jpeg, 92).encode_image(&flatten(img))?;
            pdf::write_single_image(&mut w, &jpeg, img.width(), img.height())?;
        }
        Format::Webp => img.write_to(&mut w, ImageFormat::WebP)?,
        Format::Tiff => img.write_to(&mut w, ImageFormat::Tiff)?,
        Format::Bmp => img.write_to(&mut w, ImageFormat::Bmp)?,
        Format::Gif => img.write_to(&mut w, ImageFormat::Gif)?,
        Format::Txt | Format::Docx => unreachable!("rejected above"),
    }
    Ok(())
}

/// Composites transparent pixels onto white for formats without alpha.
fn flatten(img: &DynamicImage) -> RgbImage {
    if !img.color().has_alpha() {
        return img.to_rgb8();
    }
    let rgba = img.to_rgba8();
    RgbImage::from_fn(rgba.width(), rgba.height(), |x, y| {
        let [r, g, b, a] = rgba.get_pixel(x, y).0;
        let a = u16::from(a);
        let blend = |c: u8| ((u16::from(c) * a + 255 * (255 - a)) / 255) as u8;
        Rgb([blend(r), blend(g), blend(b)])
    })
}
