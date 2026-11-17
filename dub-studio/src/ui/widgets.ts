// Knobs (bakelite), faders, bars and segmented pickers. Each takes get/set and redraws itself.
import { control, clamp, xFrac, type Gesture } from './control';

const ARC = 270, R = 16;
const pt = (deg: number, r: number) => [20 + r * Math.sin(deg * Math.PI / 180), 20 - r * Math.cos(deg * Math.PI / 180)];

// v in 0..1; bipolar knobs draw from the top
export function knobSVG(v: number, bi = false): string {
  const a0 = -ARC / 2, a = a0 + v * ARC, from = bi ? 0 : a0, [x0, y0] = pt(from, R), [x1, y1] = pt(a, R);
  const large = Math.abs(a - from) > 180 ? 1 : 0, sw = a > from ? 1 : 0, [qx, qy] = pt(a, 9.5);
  const track = `<path d="M${pt(a0, R).join(' ')}A${R} ${R} 0 1 1 ${pt(-a0, R).join(' ')}" class="k-track"/>`;
  const fill = Math.abs(a - from) > 1 ? `<path d="M${x0} ${y0}A${R} ${R} 0 ${large} ${sw} ${x1} ${y1}" class="k-fill"/>` : '';
  return `${track}${fill}<circle cx="20" cy="20" r="12" class="k-body"/><circle cx="20" cy="20" r="9" class="k-cap"/><line x1="${qx}" y1="${qy}" x2="20" y2="20" class="k-ptr"/>`;
}

export interface KnobOpts { get: () => number; set: (v: number) => void; home: number; bi?: boolean; steps?: number; label?: (v: number) => string; sens?: number }
export function knob(svg: SVGSVGElement, o: KnobOpts) {
  const lab = svg.parentElement?.querySelector('.kv') as HTMLElement | null;
  const q = (v: number) => o.steps ? Math.round(v * o.steps) / o.steps : v;
  const draw = () => { const v = o.get(); svg.innerHTML = knobSVG(v, o.bi); if (lab && o.label) lab.textContent = o.label(v); };
  svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('role', 'slider'); draw();
  control(svg, {
    down: s => { s.v0 = o.get(); },
    move: (s, e) => { o.set(q(clamp(s.v0! + (s.y0 - e.clientY) / (o.sens || 125), 0, 1))); draw(); },
    dbl: () => { o.set(o.home); draw(); },
  });
  return draw;
}

export function fader(el: HTMLElement, get: () => number, set: (v: number) => void) {
  const cap = el.querySelector('.cap') as HTMLElement, lv = el.querySelector('.lv') as HTMLElement;
  const draw = () => { const h = el.clientHeight - 24, v = get(); cap.style.transform = `translateY(${h * (1 - v)}px)`; lv.style.height = (h * v) + 'px'; };
  control(el, {
    down: s => { s.v0 = get(); },
    move: (s: Gesture, e) => { set(clamp(s.v0! + (s.y0 - e.clientY) / (s.r.height - 24), 0, 1)); draw(); },
    dbl: () => { set(1); draw(); },
  });
  draw(); return draw;
}

export interface BarOpts { get: () => number; set: (v: number) => void; relative?: boolean; snap?: number; dbl?: () => void; steps?: number }
// a horizontal bar: absolute (tap to set) or relative (drag from where it is); optional snap point and steps
export function bar(el: HTMLElement, o: BarOpts) {
  const fill = el.querySelector('.fill') as HTMLElement | null;
  const draw = () => { if (fill) fill.style.width = (o.get() * 100) + '%'; };
  const abs = (s: Gesture, e: PointerEvent) => { let v = xFrac(s, e); if (o.steps) v = Math.round(v * o.steps) / o.steps; if (o.snap !== undefined && Math.abs(v - o.snap) < 0.035) v = o.snap; o.set(v); draw(); };
  control(el, o.relative
    ? { down: s => { s.v0 = o.get(); }, move: (s, e) => { o.set(clamp(s.v0! + (e.clientX - s.x0) / s.r.width, 0, 1)); draw(); }, dbl: o.dbl && (() => { o.dbl!(); draw(); }) }
    : { down: abs, move: abs, dbl: o.dbl && (() => { o.dbl!(); draw(); }) });
  draw(); return draw;
}

export function seg(el: HTMLElement, get: () => number, set: (i: number) => void, disabled?: (i: number) => boolean) {
  const items = [...el.children] as HTMLElement[];
  const draw = () => items.forEach((x, i) => { x.classList.toggle('on', i === get()); x.classList.toggle('dim', !!disabled?.(i)); });
  items.forEach((x, i) => control(x, { down: () => { if (disabled?.(i)) return; set(i); draw(); } }));
  draw(); return draw;
}
