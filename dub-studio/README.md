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

## What's built

**Studio (Phase 1)**
- Mixer with 4 to 8 channels (banks 1–4 / 5–8 on phones): stepped Cut, Echo, Verb, fader with meter, Throw (hold), Mute (tap) / Solo (hold, green).
- Siren and Synare pads, echo Time / Repeats / Return, tap tempo.
- Transport: play, seek, 4-bar loop, cues (hold Loop), undo, reset (hold), record and share.
- Mix snapshots A–D (hold to store, tap to recall). Guided tour. Works offline after the first visit.
- FX page (echo and verb in detail), Synare XY pad, Siren page.

**Feel**
- Controls move by transform on their own GPU layers and are measured once per touch; the idle mixer does almost no layout.
- Buttons act on touch-down (Mute and Loop too: holding on switches to Solo or a cue). Pressed states are instant.
- Knobs show their value in a bubble and go fine when dragged slowly. Haptic ticks on steps, snaps and buttons (iPhone Safari 18+ via the native switch, Android via vibrate).

**Track loader (Phase 2)**
- Load 1 to 8 files; names like `drums`, `bass`, `vocals`, `guitar`, `keys`, `sax` go to their home channels.
- Each part is cut into 10 s pieces of 16-bit PCM in the browser's private storage (OPFS); only the pieces near the playhead are in memory. Mono parts are stored mono.
- Tempo found from the drums; one loudness trim for the whole song; per-part Nudge (ms); waveforms.

**Stem splitter (Phase 3)**
- htdemucs_6s (MIT) in the browser via ONNX Runtime Web: WebGPU, or WebAssembly without a GPU.
- Six parts: Drums, Bass, Other, Vocals, Guitar, Keys. The 285 MB model downloads once and stays on the device.
- `scripts/prepare-assets.mjs` fetches the pinned model, checks its SHA-256 and splits it into 20 MB parts at build time.

**Library (Phase 4)**
- Every song is kept with its own mix, A–D, cues and takes. Open, export (.zip), import, delete.
- Any part shares as a WAV. Recorded takes are saved per song.

## Tests

```bash
npm run build && npm run preview   # then, in another shell:
npm run test:e2e                   # smoke, channels, phase1, loader, library, feel
npm run test:split                 # the splitter end to end (downloads the model; slow on CPU)
```

All DSP, reverbs and the demo song are written for this project (CC0). Fonts: Shrikhand and Courier Prime (SIL OFL).
Thanks to Kibir La Amlak's [4 Track Pocket Dub Studio](https://www.kibir-la-amlak.com/dubstudio/) for the idea and concept.
