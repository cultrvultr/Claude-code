// How to play: a spotlight on the real control and a tip card. The controls stay live, so you try each one as you read.

export interface Step { el?: string; page?: string; h: string; t: string }

export const MIXER_TOUR: Step[] = [
  { h: 'Dub Studio', t: 'Your song in up to eight parts on faders. Mix it live like a dub engineer: drop parts out, cut them with the filter, throw them into the echo and the spring.<br><small>Each tip lights a control. Try it while the tip is open.</small>' },
  { el: '.song', h: 'Play', t: 'Start and stop. Tap or drag the line to jump. The title opens the Song sheet, where you load your own tracks.' },
  { el: '#loopBtn', h: 'Loop', t: 'Loops four bars from where you are, so you can work on one drop again and again. Tap again to let the song run on.' },
  { el: '#recBtn', h: 'Rec', t: 'Records what you hear, echoes and all. When you stop, share it or save it to Files.' },
  { el: '#snaps', h: 'Mix A B C D', t: 'Hold a letter to store the whole mix. Tap it to bring it back, even mid-song. Undo and Reset sit above.' },
  { el: '.st:not(.off):not([hidden]) .fd', h: 'Fader', t: 'Drag up and down. Top is full. Double tap for full. The thin bar beside it is the level meter.' },
  { el: '.st:not(.off):not([hidden]) .kn[data-p="cut"]', h: 'Cut', t: 'A stepped filter. Drag up to cut the bass away (high pass), down to cut the top off (low pass). It crunches a little when stepped, like the old passive filters. Double tap for off.' },
  { el: '.st:not(.off):not([hidden]) .kn[data-p="echo"]', h: 'Echo send', t: 'Sends the part to the tape echo. Turn it up for a moment and back down to catch one hit or one word.' },
  { el: '.st:not(.off):not([hidden]) .kn[data-p="verb"]', h: 'Verb send', t: 'Sends the part to the spring reverb.' },
  { el: '.st:not(.off):not([hidden]) .throw', h: 'Throw', t: 'Hold to send the whole part into the echo. Let go and the echoes ring on by themselves.' },
  { el: '.st:not(.off):not([hidden]) .mute', h: 'Mute and Solo', t: 'Tap to drop the part out. Press and hold to solo it: the button turns green and only soloed parts play.' },
  { el: '#pSir', h: 'Siren', t: 'Starts and stops the siren with the sound set on its page. The small knob is its level.' },
  { el: '#pSyn', h: 'Synare', t: 'Hits the drum synth. Higher on the button hits harder. The small knob is its level.' },
  { el: '.echo', h: 'Echo', t: 'Time between repeats, how many Repeats (past 9 it runs away: drag back below 9), and how loud the echoes Return. Tap sets the tempo by tapping along.' },
  { el: '#app .tabs', h: 'More pages', t: 'Synare: a big pad for pitch, decay and wobble. Siren: its sound. FX: the echo and the reverb in detail. The song keeps playing.' },
  { h: 'Good to know', t: '<b>Send</b>: how much of a part goes into an effect. <b>Return</b>: how loud the effect comes back.<br><b>High pass</b> cuts bass, <b>low pass</b> cuts top.<br>No sound? Volume up. Bluetooth adds delay to the pads: use wired or the speaker to play live.' },
];

export function makeTour(openPage: (p?: string) => void) {
  const root = document.createElement('div'); root.id = 'tour'; root.hidden = true;
  root.innerHTML = `<div class="spot"></div><div class="tip" role="dialog" aria-live="polite"><button class="x" aria-label="Close">&times;</button><h3></h3><div class="txt"></div>
    <div class="nav"><span class="count"></span><button class="back">Back</button><button class="next">Next</button></div></div>`;
  document.body.appendChild(root);
  const spot = root.querySelector<HTMLElement>('.spot')!, tip = root.querySelector<HTMLElement>('.tip')!;
  let steps: Step[] = [], i = 0;
  const target = () => { const s = steps[i]; return s.el ? document.querySelector<HTMLElement>(s.el) : null; };
  function place() {
    if (root.hidden) return;
    const el = target(), vw = innerWidth, vh = innerHeight, tw = Math.min(360, vw - 24);
    tip.style.width = tw + 'px';
    if (!el) { spot.style.cssText = 'left:50%;top:50%;width:0;height:0'; tip.style.left = (vw - tw) / 2 + 'px'; tip.style.top = Math.max(16, vh / 2 - tip.offsetHeight / 2) + 'px'; return; }
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' });
    const th = tip.offsetHeight, below = r.bottom + pad + 12, above = r.top - pad - 12 - th;
    const top = below + th < vh - 8 ? below : above > 8 ? above : Math.max(8, vh - th - 8);
    tip.style.top = top + 'px'; tip.style.left = Math.min(vw - tw - 12, Math.max(12, r.left + r.width / 2 - tw / 2)) + 'px';
  }
  function show() {
    const s = steps[i]; openPage(s.page);
    tip.querySelector('h3')!.textContent = s.h; tip.querySelector('.txt')!.innerHTML = s.t;
    tip.querySelector('.count')!.textContent = `${i + 1} / ${steps.length}`;
    (tip.querySelector('.back') as HTMLButtonElement).hidden = i === 0;
    tip.querySelector('.next')!.textContent = i === steps.length - 1 ? 'Done' : 'Next';
    requestAnimationFrame(place);
  }
  const close = () => { root.hidden = true; openPage(undefined); };
  tip.querySelector('.next')!.addEventListener('click', () => { if (i < steps.length - 1) { i++; show(); } else close(); });
  tip.querySelector('.back')!.addEventListener('click', () => { if (i > 0) { i--; show(); } });
  tip.querySelector('.x')!.addEventListener('click', close);
  addEventListener('resize', place);
  return { open(list: Step[]) { steps = list; i = 0; root.hidden = false; show(); }, close, get on() { return !root.hidden; } };
}
