// Knobs (bakelite), faders, bars and segmented pickers. Built for feel:
// - nothing is rebuilt while you drag: knobs change one path and one line, faders and bars move by transform
//   (on their own GPU layer), and sizes are measured once when the finger lands;
// - knobs go fine when you drag slowly, show their value in a bubble, and click (haptic) on steps and snaps.
import { control, clamp, type Gesture } from './control';
import { tick } from './haptic';

const ARC = 270, R = 16;
const pt = (deg: number, r: number) => [20 + r * Math.sin(deg * Math.PI / 180), 20 - r * Math.cos(deg * Math.PI / 180)];
const arcD = (from: number, to: number) => { const [x0, y0] = pt(from, R), [x1, y1] = pt(to, R); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`; };

// the value bubble: one element for the whole page, moved by transform
let bubble: HTMLElement | null = null, bubbleText = '';
// placed once when the finger lands (measuring then is free); while dragging only its text changes, and only when it differs
function placeBubble(el: Element, text: string) {
  if (!bubble) { bubble = document.createElement('div'); bubble.className = 'bubble'; document.body.appendChild(bubble); }
  const r = el.getBoundingClientRect(); bubble.hidden = false; bubbleText = ''; setBubble(text);
  bubble.style.transform = `translate(${Math.round(r.left + r.width / 2)}px, ${Math.round(r.top - 6)}px) translate(-50%, -100%)`;
}
function setBubble(text: string) { if (bubble && text !== bubbleText) { bubbleText = text; bubble.textContent = text; } }
const hideBubble = () => { if (bubble) bubble.hidden = true; };

export interface KnobOpts { get: () => number; set: (v: number) => void; home: number; bi?: boolean; steps?: number; label?: (v: number) => string; sens?: number; name?: string; fmt?: (v: number) => string }
export function knob(svg: SVGSVGElement, o: KnobOpts) {
  const lab = svg.parentElement?.querySelector('.kv') as HTMLElement | null;
  const q = (v: number) => o.steps ? Math.round(v * o.steps) / o.steps : v;
  svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('role', 'slider');
  const a0 = -ARC / 2;
  svg.innerHTML = `<path class="k-track" d="${arcD(a0, -a0)}"/><path class="k-fill"/><circle cx="20" cy="20" r="12" class="k-body"/><circle cx="20" cy="20" r="9" class="k-cap"/><line class="k-ptr" x2="20" y2="20"/>`;
  const fill = svg.querySelector('.k-fill')!, ptr = svg.querySelector('.k-ptr')!;
  let shown = NaN;
  const text = (v: number) => o.label ? o.label(v) : `${o.name || ''} ${o.fmt ? o.fmt(v) : Math.round(v * 100)}`.trim();
  const draw = () => {
    const v = o.get(); if (v === shown) return; shown = v;
    const a = a0 + v * ARC, from = o.bi ? 0 : a0, [qx, qy] = pt(a, 9.5);
    fill.setAttribute('d', Math.abs(a - from) > 1 ? arcD(from, a) : ''); ptr.setAttribute('x1', qx.toFixed(2)); ptr.setAttribute('y1', qy.toFixed(2));
    svg.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    if (lab && o.label) { const t = o.label(v); if (lab.textContent !== t) lab.textContent = t; }
  };
  const sens = o.sens || 125;
  control(svg, {
    down: (s, e) => { s.v0 = o.get(); (s as Gesture & { raw: number; ly: number; lt: number }).raw = s.v0; Object.assign(s, { ly: e.clientY, lt: e.timeStamp }); placeBubble(svg, text(o.get())); },
    move: (s, e) => {
      const g = s as Gesture & { raw: number; ly: number; lt: number }, dy = g.ly - e.clientY, dt = Math.max(1, e.timeStamp - g.lt);
      const fine = Math.abs(dy) / dt < 0.12 ? 0.35 : 1;   // slow drags go fine
      g.raw = clamp(g.raw + dy * fine / sens, 0, 1); g.ly = e.clientY; g.lt = e.timeStamp;
      const before = o.get(), v = q(g.raw);
      if (v !== before) { o.set(v); draw(); setBubble(text(v)); if (o.steps || (o.bi && (v - 0.5) * (before - 0.5) <= 0) || v === 0 || v === 1) tick(); }
    },
    up: hideBubble,
    dbl: () => { o.set(o.home); draw(); tick(); hideBubble(); },
  });
  draw(); return () => { shown = NaN; draw(); };
}

export function fader(el: HTMLElement, get: () => number, set: (v: number) => void) {
  const cap = el.querySelector('.cap') as HTMLElement, lv = el.querySelector('.lv') as HTMLElement;
  let h = 0, shown = NaN;
  const measure = () => { h = Math.max(0, el.clientHeight - 24); lv.style.height = h + 'px'; shown = NaN; };
  const draw = () => { if (!h) measure(); const v = get(); if (v === shown) return; shown = v; cap.style.transform = `translate3d(0, ${(h * (1 - v)).toFixed(1)}px, 0)`; lv.style.transform = `scaleY(${v.toFixed(4)})`; };
  control(el, {
    down: s => { s.v0 = get(); },
    move: (s, e) => { const before = get(), v = clamp(s.v0! + (s.y0 - e.clientY) / (s.r.height - 24), 0, 1); if (v === before) return; set(v); draw(); if (v === 1 || v === 0) tick(); },
    dbl: () => { set(1); draw(); tick(); },
  });
  addEventListener('resize', () => { measure(); draw(); });
  return () => { measure(); draw(); };
}

export interface BarOpts { get: () => number; set: (v: number) => void; relative?: boolean; snap?: number; dbl?: () => void; steps?: number }
// a horizontal bar: absolute (tap to set) or relative (drag from where it is); optional snap point and steps
export function bar(el: HTMLElement, o: BarOpts) {
  const fill = el.querySelector('.fill') as HTMLElement | null;
  let shown = NaN;
  const draw = () => { const v = o.get(); if (v === shown || !fill) return; shown = v; fill.style.transform = `scaleX(${v.toFixed(4)})`; };
  const put = (v: number) => { const before = o.get(); if (v === before) return; o.set(v); draw();
    if ((o.steps && Math.round(v * o.steps) !== Math.round(before * o.steps)) || (o.snap !== undefined && v === o.snap) || v === 0 || v === 1) tick(); };
  const abs = (s: Gesture, e: PointerEvent) => { let v = clamp((e.clientX - s.r.left) / s.r.width, 0, 1); if (o.steps) v = Math.round(v * o.steps) / o.steps; if (o.snap !== undefined && Math.abs(v - o.snap) < 0.035) v = o.snap; put(v); };
  control(el, o.relative
    ? { down: s => { s.v0 = o.get(); }, move: (s, e) => put(clamp(s.v0! + (e.clientX - s.x0) / s.r.width, 0, 1)), dbl: o.dbl && (() => { o.dbl!(); draw(); tick(); }) }
    : { down: abs, move: abs, dbl: o.dbl && (() => { o.dbl!(); draw(); tick(); }) });
  draw(); return () => { shown = NaN; draw(); };
}

export function seg(el: HTMLElement, get: () => number, set: (i: number) => void, disabled?: (i: number) => boolean) {
  const items = [...el.children] as HTMLElement[];
  const draw = () => items.forEach((x, i) => { x.classList.toggle('on', i === get()); x.classList.toggle('dim', !!disabled?.(i)); });
  items.forEach((x, i) => control(x, { down: () => { if (disabled?.(i)) return; if (get() !== i) tick(); set(i); draw(); } }));
  draw(); return draw;
}
