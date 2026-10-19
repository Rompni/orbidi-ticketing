import { invoke } from "@tauri-apps/api/core";
import { t } from "./i18n";

interface PlatformInfo {
  os: string;
  needs_permission: boolean;
  wayland: boolean;
}

const app = document.querySelector<HTMLElement>("#app")!;
let step = 0;
let granted = false;
let poll: number | undefined;

function h(tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

function button(label: string, onClick: () => void, opts: { primary?: boolean; disabled?: boolean } = {}) {
  const b = h("button", { class: opts.primary ? "primary" : "" }, label) as HTMLButtonElement;
  b.disabled = !!opts.disabled;
  b.addEventListener("click", onClick);
  return b;
}

function dots(total: number): HTMLElement {
  return h("div", { class: "dots" }, ...Array.from({ length: total }, (_, i) => h("span", { class: i === step ? "on" : "" })));
}

/** A small looping animation of the gesture: a file slides into a wheel. */
function demo(): HTMLElement {
  return h(
    "div",
    { class: "demo", "aria-hidden": "true" },
    h("div", { class: "demo-wheel" }, ...Array.from({ length: 6 }, (_, i) => h("span", { style: `--i:${i}` }))),
    h("div", { class: "demo-file" }, "PNG"),
    h("kbd", { class: "demo-key" }, "⇧ Shift"),
  );
}

function permissionStep(info: PlatformInfo): HTMLElement[] {
  if (info.wayland) {
    return [h("h1", {}, t.waylandTitle), h("p", { class: "warn" }, t.waylandBody)];
  }
  if (!info.needs_permission) {
    return [h("h1", {}, t.noPermTitle), h("p", {}, t.noPermBody)];
  }
  const status = h("p", { class: granted ? "status ok" : "status" }, granted ? `✓ ${t.permGranted}` : t.permWaiting);
  return [
    h("h1", {}, t.permTitle),
    h("p", {}, t.permBody),
    h("ol", {}, ...t.permSteps.map((s) => h("li", {}, s))),
    granted ? status : h("div", { class: "row" }, button(t.permButton, () => void invoke("request_permission"), { primary: true }), status),
  ];
}

function watchPermission(info: PlatformInfo): void {
  clearInterval(poll);
  if (!info.needs_permission || granted) return;
  poll = window.setInterval(async () => {
    granted = await invoke<boolean>("permission_granted");
    if (granted) {
      clearInterval(poll);
      render(info);
    }
  }, 1000);
}

function render(info: PlatformInfo): void {
  const steps: { body: HTMLElement[]; canContinue: boolean }[] = [
    { body: [demo(), h("h1", {}, t.welcomeTitle), h("p", {}, t.welcomeBody)], canContinue: true },
    { body: permissionStep(info), canContinue: !info.needs_permission || granted },
    { body: [demo(), h("h1", {}, t.tryTitle), h("p", {}, t.tryBody), h("p", { class: "hint" }, t.tryHint)], canContinue: true },
  ];
  const current = steps[step];
  const last = step === steps.length - 1;

  const nav = h(
    "nav",
    {},
    step > 0 ? button(t.back, () => go(info, step - 1)) : h("span"),
    dots(steps.length),
    last
      ? button(t.finish, () => void invoke("finish_onboarding"), { primary: true })
      : button(t.next, () => go(info, step + 1), { primary: true, disabled: !current.canContinue }),
  );
  app.replaceChildren(h("section", {}, ...current.body), nav);
  if (step === 1) watchPermission(info);
}

function go(info: PlatformInfo, next: number): void {
  step = next;
  render(info);
}

void (async () => {
  const info = await invoke<PlatformInfo>("platform_info");
  granted = await invoke<boolean>("permission_granted");
  render(info);
})();
