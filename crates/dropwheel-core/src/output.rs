use std::path::{Path, PathBuf};

/// Returns `<dir>/<stem><suffix>.<ext>` next to `source`, adding ` (2)`, ` (3)`…
/// until the name is free so existing files are never overwritten.
pub fn unique_output_path(source: &Path, suffix: &str, ext: &str) -> PathBuf {
    let dir = source.parent().unwrap_or_else(|| Path::new("."));
    let stem = source
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "output".into());

    let candidate = dir.join(format!("{stem}{suffix}.{ext}"));
    if !candidate.exists() {
        return candidate;
    }
    (2..)
        .map(|n| dir.join(format!("{stem}{suffix} ({n}).{ext}")))
        .find(|p| !p.exists())
        .expect("an unbounded range always yields a free name")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_next_free_name() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("Page 001.pdf");
        assert_eq!(
            unique_output_path(&src, "", "jpg"),
            dir.path().join("Page 001.jpg")
        );

        std::fs::write(dir.path().join("Page 001.jpg"), b"").unwrap();
        assert_eq!(
            unique_output_path(&src, "", "jpg"),
            dir.path().join("Page 001 (2).jpg")
        );
    }
}
