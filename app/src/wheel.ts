// Geometry and rendering of the radial menu. Segment 0 is centered at 12 o'clock
// and the rest follow clockwise.

export const SIZE = 380;
const C = SIZE / 2;
export const OUTER_R = 180;
export const INNER_R = 74;
export const HUB_R = 64;
const GAP = 0.035; // radians between segments

export type Hit = { kind: "segment"; index: number } | { kind: "hub" } | { kind: "none" };

/** Which part of the wheel is under (x, y), in CSS pixels relative to the window. */
export function hitTest(x: number, y: number, segments: number): Hit {
  const dx = x - C;
  const dy = y - C;
  const r = Math.hypot(dx, dy);
  if (r <= HUB_R) return { kind: "hub" };
  if (r < INNER_R || r > OUTER_R || segments === 0) return { kind: "none" };
  const step = (2 * Math.PI) / segments;
  const angle = (Math.atan2(dx, -dy) + 2 * Math.PI + step / 2) % (2 * Math.PI);
  return { kind: "segment", index: Math.floor(angle / step) % segments };
}

function polar(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function sectorPath(index: number, segments: number): string {
  if (segments === 1) {
    // A full ring: two half-arcs per circle.
    return [
      `M ${C} ${C - OUTER_R}`,
      `A ${OUTER_R} ${OUTER_R} 0 1 1 ${C} ${C + OUTER_R}`,
      `A ${OUTER_R} ${OUTER_R} 0 1 1 ${C} ${C - OUTER_R}`,
      `M ${C} ${C - INNER_R}`,
      `A ${INNER_R} ${INNER_R} 0 1 0 ${C} ${C + INNER_R}`,
      `A ${INNER_R} ${INNER_R} 0 1 0 ${C} ${C - INNER_R}`,
      "Z",
    ].join(" ");
  }
  const step = (2 * Math.PI) / segments;
  const a0 = index * step - step / 2 + GAP;
  const a1 = index * step + step / 2 - GAP;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(OUTER_R, a0);
  const [x1, y1] = polar(OUTER_R, a1);
  const [x2, y2] = polar(INNER_R, a1);
  const [x3, y3] = polar(INNER_R, a0);
  return [
    `M ${x0} ${y0}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${x3} ${y3}`,
    "Z",
  ].join(" ");
}

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export interface WheelView {
  labels: string[];
  hover: number | null;
  hubText: string;
  hubSubtext?: string;
  hubHover?: boolean;
  hubState?: "idle" | "busy" | "done" | "error";
}

export function render(svg: SVGSVGElement, view: WheelView): void {
  svg.replaceChildren();
  svg.append(el("circle", { cx: C, cy: C, r: OUTER_R + 8, class: "rim" }));

  view.labels.forEach((label, i) => {
    const g = el("g", { class: i === view.hover ? "segment hover" : "segment" });
    g.append(el("path", { d: sectorPath(i, view.labels.length) }));
    const step = (2 * Math.PI) / view.labels.length;
    const [tx, ty] =
      view.labels.length === 1 ? [C, C - (OUTER_R + INNER_R) / 2] : polar((OUTER_R + INNER_R) / 2, i * step);
    const text = el("text", { x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "central" });
    text.textContent = label;
    g.append(text);
    svg.append(g);
  });

  const hub = el("g", { class: `hub ${view.hubState ?? "idle"}${view.hubHover ? " hover" : ""}` });
  hub.append(el("circle", { cx: C, cy: C, r: HUB_R }));
  const main = el("text", {
    x: C,
    y: view.hubSubtext ? C - 9 : C,
    "text-anchor": "middle",
    "dominant-baseline": "central",
  });
  main.textContent = view.hubText;
  hub.append(main);
  if (view.hubSubtext) {
    const sub = el("text", { x: C, y: C + 13, class: "sub", "text-anchor": "middle", "dominant-baseline": "central" });
    sub.textContent = view.hubSubtext;
    hub.append(sub);
  }
  svg.append(hub);
}
