// One pointer helper for every control: capture, several fingers at once, double tap, long press.
import { gestureStart, gestureEnd } from '../state';

export interface Gesture { r: DOMRect; x0: number; y0: number; v0?: number; dbl?: boolean; long?: boolean; t?: number; skip?: boolean }
type Fn = (s: Gesture, e: PointerEvent) => void;
export interface Opts { down?: Fn; move?: Fn; up?: Fn; dbl?: Fn; long?: Fn; longMs?: number; undoable?: boolean }

export function control(el: Element, o: Opts) {
  const g = new Map<number, Gesture>(); let lastDown = 0;
  el.addEventListener('pointerdown', ev => {
    const e = ev as PointerEvent; e.preventDefault();
    try { (el as HTMLElement).setPointerCapture(e.pointerId); } catch { /* gone */ }
    const n = performance.now(), s: Gesture = { r: el.getBoundingClientRect(), x0: e.clientX, y0: e.clientY };
    el.classList.add('pressed');   // instant visual feedback, no transition
    if (o.undoable !== false) gestureStart();
    if (o.dbl && n - lastDown < 300) { lastDown = 0; s.dbl = true; g.set(e.pointerId, s); o.dbl(s, e); return; }
    lastDown = n; g.set(e.pointerId, s);
    if (o.long) s.t = window.setTimeout(() => { s.long = true; o.long!(s, e); }, o.longMs || 280);
    o.down?.(s, e);
  });
  el.addEventListener('pointermove', ev => { const e = ev as PointerEvent, s = g.get(e.pointerId); if (!s || s.dbl) return;
    if (s.t && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) { clearTimeout(s.t); s.t = 0; }
    o.move?.(s, e); });
  const end = (ev: Event) => { const e = ev as PointerEvent, s = g.get(e.pointerId); if (!s) return; g.delete(e.pointerId); clearTimeout(s.t); if (!g.size) el.classList.remove('pressed');
    if (!s.dbl) o.up?.(s, e); if (o.undoable !== false) gestureEnd(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  for (const t of ['touchstart', 'touchmove']) el.addEventListener(t, e => e.preventDefault(), { passive: false });
}

// page-wide: no pinch zoom, no scroll, no double-tap zoom, no long-press menu (sheets and dialogs keep their taps)
export function guardPage() {
  for (const t of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (!(e.target as Element).closest?.('.scroll')) e.preventDefault(); }, { passive: false });
  let last = 0;
  document.addEventListener('touchend', e => { if ((e.target as Element).closest?.('.sheet, #start, #tour .tip, input, select, a')) return;
    const n = Date.now(); if (n - last < 350) e.preventDefault(); last = n; }, { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
}

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const xFrac = (s: Gesture, e: PointerEvent) => clamp((e.clientX - s.r.left) / s.r.width, 0, 1);
