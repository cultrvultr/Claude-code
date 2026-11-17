# Pocket Dub Studio

Dub any four tracks live on your phone: faders, stepped filters, a tape echo, spring reverbs, a siren and a Synare-style drum. Built for a recent iPhone in Safari. See [PLAN.md](PLAN.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5173, also on your LAN for a phone
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ on :4173
npm run test:e2e   # iPhone-emulated smoke test against the preview
```

## Deploy (Cloudflare Pages)

Connect this GitHub repo in Cloudflare Pages with:
- Root directory: `dub-studio`
- Build command: `npm run build`
- Output directory: `dist`

`public/_headers` sets COOP/COEP for the stem splitter (Phase 3).

## What's in Phase 1 so far

- Mixer: 4 strips (stepped Cut, Echo, Verb, fader with meter, Throw, Mute with hold-to-kill), Siren and Synare pads with level knobs, echo Time / Repeats / Return, tap tempo.
- Transport: play, seek, 4-bar loop, undo, reset (hold), record and share.
- FX page: Echo (Sync/Free, note lengths, Mono/Stereo/Ping-pong, tone, echo to verb, instrument dry/wet) and Verb (5 reverbs, decay with envelope, low/high cut, return).
- Synare page (XY pad, second finger wobble) and Siren page (Base, Mode, Beat, Trig toggle/hold, Signal, Swoop).
- Demo riddim generated in the browser. Load your own files per slot or 4 at once.
- iPhone: plays with the silent switch on, wake lock, lock-screen controls, resume after interruption, Bluetooth delay notice, Add to Home Screen hint, landscape overlay.

All DSP, reverbs and the demo song are written for this project (CC0). Fonts: Shrikhand and Courier Prime (SIL OFL).
