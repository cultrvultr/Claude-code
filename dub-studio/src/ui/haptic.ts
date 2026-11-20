// A light haptic tick. iPhone Safari (18+) has no vibration API, but toggling a native switch control gives the
// system's own haptic, so a hidden <input type=checkbox switch> is clicked through its label. Android uses vibrate().
let label: HTMLLabelElement | null = null, last = 0;
export function tick() {
  const n = performance.now(); if (n - last < 35) return; last = n;
  if (navigator.vibrate && !/iPhone|iPad/.test(navigator.userAgent)) { try { navigator.vibrate(6); } catch { /* blocked */ } return; }
  if (!label) {
    label = document.createElement('label'); label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    label.appendChild(i); document.body.appendChild(label);
  }
  label.click();
}
