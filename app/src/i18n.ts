const en = {
  dropHere: "Drop a file",
  unsupported: "Unsupported file",
  tools: "Tools",
  convert: "Convert",
  working: "Working…",
  done: (n: number) => (n === 1 ? "Done" : `${n} files done`),
  failed: "Failed",
  reveal: "Click to show",

  welcomeTitle: "Welcome to Dropwheel",
  welcomeBody:
    "Drag any file, hold Shift, and a wheel appears under your cursor. Drop the file on a segment to convert it or run a tool.",
  next: "Next",
  back: "Back",
  permTitle: "Allow Accessibility",
  permBody:
    "Dropwheel needs the Accessibility permission to notice when you hold Shift while dragging. It never reads what you type.",
  permSteps: [
    "Click “Open System Settings”.",
    "Turn on Dropwheel under Privacy & Security → Accessibility.",
    "Come back here, this screen updates on its own.",
  ],
  permButton: "Open System Settings",
  permWaiting: "Waiting for permission…",
  permGranted: "Permission granted",
  noPermTitle: "No permission needed",
  noPermBody: "On this system Dropwheel can watch the drag + Shift gesture without extra permissions.",
  waylandTitle: "Wayland detected",
  waylandBody:
    "Wayland doesn't let apps watch the mouse and keyboard globally, so the drag + Shift gesture won't work in this session. Log in with an X11 session to use it; a shortcut-based trigger for Wayland is planned.",
  tryTitle: "Try it",
  tryBody: "Drag an image from your file manager, press Shift while dragging, and drop it on PNG, JPG, WEBP…",
  tryHint: "The result is saved next to the original. Nothing is overwritten.",
  finish: "Start using Dropwheel",
};

const es: typeof en = {
  dropHere: "Suelta un archivo",
  unsupported: "Archivo no compatible",
  tools: "Herramientas",
  convert: "Convertir",
  working: "Procesando…",
  done: (n) => (n === 1 ? "Listo" : `${n} archivos listos`),
  failed: "Error",
  reveal: "Clic para mostrar",

  welcomeTitle: "Bienvenido a Dropwheel",
  welcomeBody:
    "Arrastra cualquier archivo, mantén Shift y aparecerá una rueda bajo el cursor. Suelta el archivo sobre un sector para convertirlo o aplicarle una herramienta.",
  next: "Siguiente",
  back: "Atrás",
  permTitle: "Permite la Accesibilidad",
  permBody:
    "Dropwheel necesita el permiso de Accesibilidad para saber cuándo mantienes Shift mientras arrastras. Nunca lee lo que escribes.",
  permSteps: [
    "Pulsa «Abrir Ajustes del Sistema».",
    "Activa Dropwheel en Privacidad y seguridad → Accesibilidad.",
    "Vuelve aquí: esta pantalla se actualiza sola.",
  ],
  permButton: "Abrir Ajustes del Sistema",
  permWaiting: "Esperando el permiso…",
  permGranted: "Permiso concedido",
  noPermTitle: "No hace falta ningún permiso",
  noPermBody: "En este sistema Dropwheel puede detectar el gesto arrastrar + Shift sin permisos adicionales.",
  waylandTitle: "Wayland detectado",
  waylandBody:
    "Wayland no permite a las apps vigilar el ratón y el teclado de forma global, así que el gesto arrastrar + Shift no funcionará en esta sesión. Inicia sesión con X11 para usarlo; hay prevista una alternativa con atajo de teclado para Wayland.",
  tryTitle: "Pruébalo",
  tryBody: "Arrastra una imagen desde tu explorador de archivos, pulsa Shift mientras arrastras y suéltala sobre PNG, JPG, WEBP…",
  tryHint: "El resultado se guarda junto al original. No se sobrescribe nada.",
  finish: "Empezar a usar Dropwheel",
};

export const t = navigator.language.toLowerCase().startsWith("es") ? es : en;
