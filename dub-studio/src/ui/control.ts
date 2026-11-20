// One pointer helper for every control: capture, several fingers at once, double tap, long press.
// A gesture can be abandoned (a swipe across the strips takes it over): the control puts its value back.
import { gestureStart, gestureEnd } from '../state';

export interface Gesture { r: DOMRect; x0: number; y0: number; v0?: number; dbl?: boolean; long?: boolean; t?: number; skip?: boolean }
type Fn = (s: Gesture, e: PointerEvent) => void;
export interface Opts { down?: Fn; move?: Fn; up?: Fn; dbl?: Fn; long?: Fn; longMs?: number; undoable?: boolean; cancel?: (s: Gesture) => void }

interface Live { el: Element; o: Opts; s: Gesture; end: () => void }
const live = new Set<Live>();

export function control(el: Element, o: Opts) {
  const g = new Map<number, Gesture>(); let lastDown = 0;
  const finish = (id: number, s: Gesture, l: Live) => { if (g.get(id) !== s) return; g.delete(id); clearTimeout(s.t); live.delete(l);
    if (!g.size) el.classList.remove('pressed'); if (o.undoable !== false) gestureEnd(); };
  const lives = new Map<number, Live>();
  el.addEventListener('pointerdown', ev => {
    const e = ev as PointerEvent; e.preventDefault();
    try { (el as HTMLElement).setPointerCapture(e.pointerId); } catch { /* gone */ }
    const n = performance.now(), s: Gesture = { r: el.getBoundingClientRect(), x0: e.clientX, y0: e.clientY }, id = e.pointerId;
    el.classList.add('pressed');   // instant visual feedback, no transition
    if (o.undoable !== false) gestureStart();
    const l: Live = { el, o, s, end: () => finish(id, s, l) }; live.add(l); lives.set(id, l);
    if (o.dbl && n - lastDown < 300) { lastDown = 0; s.dbl = true; g.set(id, s); o.dbl(s, e); return; }
    lastDown = n; g.set(id, s);
    if (o.long) s.t = window.setTimeout(() => { s.long = true; o.long!(s, e); }, o.longMs || 280);
    o.down?.(s, e);
  });
  el.addEventListener('pointermove', ev => { const e = ev as PointerEvent, s = g.get(e.pointerId); if (!s || s.dbl) return;
    if (s.t && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) { clearTimeout(s.t); s.t = 0; }
    o.move?.(s, e); });
  const end = (ev: Event) => { const e = ev as PointerEvent, s = g.get(e.pointerId), l = lives.get(e.pointerId); if (!s || !l) return;
    lives.delete(e.pointerId); if (!s.dbl) o.up?.(s, e); finish(e.pointerId, s, l); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  for (const t of ['touchstart', 'touchmove']) el.addEventListener(t, e => e.preventDefault(), { passive: false });
}

// a swipe took over: every control under `root` that a finger is on lets go and undoes what the touch did
export function abandonWithin(root: Element) {
  for (const l of [...live]) if (root.contains(l.el)) { l.o.cancel?.(l.s); l.s.dbl = true; l.end(); }
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
