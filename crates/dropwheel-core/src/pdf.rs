use std::io::{self, Write};

/// Writes a one-page PDF showing a JPEG at 72 dpi (one pixel per point).
pub fn write_single_image(
    out: &mut impl Write,
    jpeg: &[u8],
    width: u32,
    height: u32,
) -> io::Result<()> {
    let content = format!("q {width} 0 0 {height} 0 0 cm /Im0 Do Q");
    let mut buf: Vec<u8> = Vec::new();
    let mut offsets = Vec::new();

    buf.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    let mut object = |buf: &mut Vec<u8>, body: &[u8]| {
        offsets.push(buf.len());
        let n = offsets.len();
        buf.extend_from_slice(format!("{n} 0 obj\n").as_bytes());
        buf.extend_from_slice(body);
        buf.extend_from_slice(b"\nendobj\n");
    };

    object(&mut buf, b"<< /Type /Catalog /Pages 2 0 R >>");
    object(&mut buf, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(
        &mut buf,
        format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] \
             /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"
        )
        .as_bytes(),
    );
    let mut image = format!(
        "<< /Type /XObject /Subtype /Image /Width {width} /Height {height} \
         /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>\nstream\n",
        jpeg.len()
    )
    .into_bytes();
    image.extend_from_slice(jpeg);
    image.extend_from_slice(b"\nendstream");
    object(&mut buf, &image);
    let mut contents = format!("<< /Length {} >>\nstream\n", content.len()).into_bytes();
    contents.extend_from_slice(content.as_bytes());
    contents.extend_from_slice(b"\nendstream");
    object(&mut buf, &contents);

    let xref = buf.len();
    buf.extend_from_slice(
        format!("xref\n0 {}\n0000000000 65535 f \n", offsets.len() + 1).as_bytes(),
    );
    for off in &offsets {
        buf.extend_from_slice(format!("{off:010} 00000 n \n").as_bytes());
    }
    buf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
            offsets.len() + 1
        )
        .as_bytes(),
    );
    out.write_all(&buf)
}
