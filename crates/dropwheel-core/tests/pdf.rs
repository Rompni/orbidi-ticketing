use std::io::Read;
use std::path::{Path, PathBuf};

use dropwheel_core::{actions_for, run, Action, Error, Format};

/// Builds a valid PDF with one page per string, each drawing that text in Helvetica.
fn text_pdf(dir: &Path, pages: &[&str]) -> PathBuf {
    let n = pages.len();
    let mut objects: Vec<String> = vec![
        "<< /Type /Catalog /Pages 2 0 R >>".into(),
        format!(
            "<< /Type /Pages /Kids [{}] /Count {n} >>",
            (0..n)
                .map(|i| format!("{} 0 R", 4 + 2 * i))
                .collect::<Vec<_>>()
                .join(" ")
        ),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>".into(),
    ];
    for (i, text) in pages.iter().enumerate() {
        let content = format!("BT /F1 24 Tf 72 720 Td ({text}) Tj ET");
        objects.push(format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] \
             /Resources << /Font << /F1 3 0 R >> >> /Contents {} 0 R >>",
            5 + 2 * i
        ));
        objects.push(format!(
            "<< /Length {} >>\nstream\n{content}\nendstream",
            content.len()
        ));
    }

    let mut pdf = String::from("%PDF-1.4\n");
    let mut offsets = Vec::new();
    for (i, obj) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.push_str(&format!("{} 0 obj\n{obj}\nendobj\n", i + 1));
    }
    let xref = pdf.len();
    pdf.push_str(&format!(
        "xref\n0 {}\n0000000000 65535 f \n",
        objects.len() + 1
    ));
    for off in offsets {
        pdf.push_str(&format!("{off:010} 00000 n \n"));
    }
    pdf.push_str(&format!(
        "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
        objects.len() + 1
    ));

    let path = dir.join("Page 001.pdf");
    std::fs::write(&path, pdf).unwrap();
    path
}

#[test]
fn pdf_offers_document_and_image_targets() {
    let ids: Vec<String> = actions_for(Path::new("doc.pdf"))
        .into_iter()
        .map(|a| a.id)
        .collect();
    assert_eq!(
        ids,
        ["convert:docx", "convert:jpg", "convert:png", "convert:txt"]
    );
}

#[test]
fn single_page_pdf_renders_to_one_image() {
    let dir = tempfile::tempdir().unwrap();
    let src = text_pdf(dir.path(), &["Hello Dropwheel"]);
    let out = run(&src, Action::Convert(Format::Png)).unwrap();
    assert_eq!(out, [dir.path().join("Page 001.png")]);

    // US Letter at 216 dpi, with dark text pixels on a white page.
    let img = image::open(&out[0]).unwrap().to_rgb8();
    assert_eq!(img.dimensions(), (1836, 2376));
    assert_eq!(img.get_pixel(5, 5).0, [255, 255, 255]);
    assert!(img.pixels().any(|p| p.0.iter().all(|&c| c < 100)));
}

#[test]
fn multi_page_pdf_renders_one_image_per_page() {
    let dir = tempfile::tempdir().unwrap();
    let src = text_pdf(dir.path(), &["One", "Two", "Three"]);
    let out = run(&src, Action::Convert(Format::Jpeg)).unwrap();
    let names: Vec<_> = out
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        names,
        ["Page 001-1.jpg", "Page 001-2.jpg", "Page 001-3.jpg"]
    );
}

#[test]
fn pdf_to_txt_extracts_text() {
    let dir = tempfile::tempdir().unwrap();
    let src = text_pdf(dir.path(), &["Hello Dropwheel", "Second page"]);
    let out = run(&src, Action::Convert(Format::Txt)).unwrap();
    let text = std::fs::read_to_string(&out[0]).unwrap();
    assert!(text.contains("Hello Dropwheel"), "{text:?}");
    assert!(text.contains("Second page"), "{text:?}");
}

#[test]
fn pdf_to_docx_writes_a_word_document() {
    let dir = tempfile::tempdir().unwrap();
    let src = text_pdf(dir.path(), &["Fish & Chips", "Second page"]);
    let out = run(&src, Action::Convert(Format::Docx)).unwrap();

    let mut zip = zip::ZipArchive::new(std::fs::File::open(&out[0]).unwrap()).unwrap();
    let mut xml = String::new();
    zip.by_name("word/document.xml")
        .unwrap()
        .read_to_string(&mut xml)
        .unwrap();
    assert!(xml.contains("Fish &amp; Chips"), "{xml}");
    assert!(xml.contains(r#"<w:br w:type="page"/>"#));
    assert!(zip.by_name("[Content_Types].xml").is_ok());
}

#[test]
fn image_only_pdf_has_no_text() {
    let dir = tempfile::tempdir().unwrap();
    let png = dir.path().join("scan.png");
    image::RgbImage::from_pixel(20, 20, image::Rgb([200, 30, 30]))
        .save(&png)
        .unwrap();
    let pdf = run(&png, Action::Convert(Format::Pdf)).unwrap().remove(0);

    assert!(matches!(
        run(&pdf, Action::Convert(Format::Txt)),
        Err(Error::NoText)
    ));
    // But it still renders: the red image fills the page.
    let img = run(&pdf, Action::Convert(Format::Png)).unwrap().remove(0);
    let px = image::open(img).unwrap().to_rgb8().get_pixel(30, 30).0;
    assert!(px[0] > 150 && px[1] < 80, "{px:?}");
}
