import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { t } from "./i18n";
import { hitTest, render, type Hit, type WheelView } from "./wheel";

interface ActionInfo {
  id: string;
  label: string;
  group: "convert" | "tools";
}

type Phase = "waiting" | "hovering" | "busy" | "done" | "error";

const HUB_DWELL_MS = 450; // hovering the hub this long switches Convert ⇄ Tools
const RESULT_MS = 2200; // how long the result stays visible after a drop

const svg = document.querySelector<SVGSVGElement>("#wheel")!;

let phase: Phase = "waiting";
let actions: ActionInfo[] = [];
let group: ActionInfo["group"] = "convert";
let hit: Hit = { kind: "none" };
let fileName = "";
let outputs: string[] = [];
let hubTimer: number | undefined;
let hideTimer: number | undefined;

const visible = () => actions.filter((a) => a.group === group);
const otherGroup = () => (group === "convert" ? "tools" : "convert");
const hasOtherGroup = () => actions.some((a) => a.group === otherGroup());

function baseName(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  return name.length > 16 ? `${name.slice(0, 13)}…` : name;
}

function draw(): void {
  const labels = visible().map((a) => a.label.toUpperCase());
  const hover = hit.kind === "segment" ? hit.index : null;
  const view: WheelView = { labels, hover, hubText: fileName || t.dropHere };

  if (phase === "waiting") {
    view.labels = [];
  } else if (phase === "hovering") {
    if (actions.length === 0) {
      view.hubText = t.unsupported;
    } else if (hasOtherGroup()) {
      view.hubSubtext = group === "convert" ? `⇄ ${t.tools}` : `⇄ ${t.convert}`;
      view.hubHover = hit.kind === "hub";
    }
  } else if (phase === "busy") {
    Object.assign(view, { hubText: t.working, hubState: "busy" });
  } else if (phase === "done") {
    Object.assign(view, {
      hubText: outputs.length === 1 ? baseName(outputs[0]) : t.done(outputs.length),
      hubSubtext: t.reveal,
      hubState: "done",
    });
  } else {
    Object.assign(view, { hubText: t.failed, hubState: "error" });
  }
  render(svg, view);
}

function reset(): void {
  phase = "waiting";
  actions = [];
  group = "convert";
  hit = { kind: "none" };
  fileName = "";
  outputs = [];
  clearTimeout(hubTimer);
  clearTimeout(hideTimer);
  draw();
}

function hide(): void {
  clearTimeout(hideTimer);
  void invoke("hide_overlay");
  reset();
}

function hideLater(ms: number): void {
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, ms);
}

/** Drag-drop positions are physical pixels relative to the webview. */
function toHit(pos: { x: number; y: number }): Hit {
  const scale = window.devicePixelRatio || 1;
  return hitTest(pos.x / scale, pos.y / scale, visible().length);
}

function updateHover(next: Hit): void {
  const enteredHub = next.kind === "hub" && hit.kind !== "hub";
  if (next.kind !== "hub") clearTimeout(hubTimer);
  if (enteredHub && hasOtherGroup()) {
    hubTimer = window.setTimeout(() => {
      group = otherGroup();
      draw();
    }, HUB_DWELL_MS);
  }
  hit = next;
  draw();
}

async function onEnter(paths: string[]): Promise<void> {
  clearTimeout(hideTimer);
  fileName = paths.length === 1 ? baseName(paths[0]) : `${paths.length} × 📄`;
  actions = paths.length ? await invoke<ActionInfo[]>("actions_for", { path: paths[0] }) : [];
  group = actions.some((a) => a.group === "convert") ? "convert" : "tools";
  phase = "hovering";
  draw();
}

async function onDrop(paths: string[], target: Hit): Promise<void> {
  clearTimeout(hubTimer);
  if (target.kind !== "segment" || !visible()[target.index]) {
    hide();
    return;
  }
  const action = visible()[target.index].id;
  phase = "busy";
  draw();
  try {
    outputs = [];
    for (const path of paths) {
      outputs.push(await invoke<string>("run_action", { path, action }));
    }
    phase = "done";
  } catch (err) {
    console.error(err);
    phase = "error";
  }
  draw();
  hideLater(RESULT_MS);
}

svg.addEventListener("click", () => {
  if (phase === "done" && outputs.length) {
    void invoke("reveal", { path: outputs[0] });
    hide();
  }
});
// Keep the result on screen while the pointer is over it.
svg.addEventListener("mouseenter", () => phase === "done" && clearTimeout(hideTimer));
svg.addEventListener("mouseleave", () => phase === "done" && hideLater(600));
window.addEventListener("keydown", (e) => e.key === "Escape" && hide());

void listen("overlay:show", () => reset());

void getCurrentWebview().onDragDropEvent((event) => {
  const p = event.payload;
  switch (p.type) {
    case "enter":
      void onEnter(p.paths).then(() => updateHover(toHit(p.position)));
      break;
    case "over":
      if (phase === "hovering") updateHover(toHit(p.position));
      break;
    case "drop":
      void onDrop(p.paths, toHit(p.position));
      break;
    case "leave":
      if (phase === "hovering") updateHover({ kind: "none" });
      break;
  }
});

draw();
