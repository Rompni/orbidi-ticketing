//! Runs one action from the command line, handy for trying the engine on real files:
//!
//!     cargo run --release --example convert -- "Page 001.pdf" convert:png

fn main() {
    let mut args = std::env::args().skip(1);
    let (Some(path), Some(action)) = (args.next(), args.next()) else {
        eprintln!("usage: convert <file> <action>   e.g. convert photo.png convert:jpg");
        std::process::exit(2);
    };
    let path = std::path::PathBuf::from(path);
    let action = dropwheel_core::Action::parse(&action).unwrap_or_else(|e| {
        eprintln!("{e}");
        std::process::exit(2);
    });
    match dropwheel_core::run(&path, action) {
        Ok(outputs) => outputs.iter().for_each(|p| println!("{}", p.display())),
        Err(e) => {
            eprintln!("error: {e}");
            std::process::exit(1);
        }
    }
}
