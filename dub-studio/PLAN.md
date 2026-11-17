# Pocket Dub Studio (any 4 tracks): build plan

Target: the functionality of https://www.kibir-la-amlak.com/dubstudio/, but with any four user-loaded tracks instead of one fixed song.

We copy behaviour, not code, art or brand. The reference site's DSP engines (Synare, SE-1, HH Echo circuit models), its font, its name and its song are the author's. We write our own engines and our own look.

---

## 1. What the reference site does

### 1.1 Architecture
- One 247 KB `index.html`: inline CSS, an inline font (base64 woff2), and ~160 KB of inline JS. No framework, no build output visible.
- PWA manifest (`standalone`, portrait, dark theme colour, 180/512 icons). Apple web-app meta tags. No service worker.
- Web Audio graph on the main thread; the instrument and echo engines run in one **AudioWorklet** (built from a Blob URL). Fallback to a `ScriptProcessor` on old browsers.
- Settings saved in `localStorage` (echo, mixer, Synare, siren, language, "tour seen").
- 24 languages. UI strings inline; tour text fetched per language (`i18n/<code>.json`). RTL support. Font-fallback when a glyph is missing.

### 1.2 Screens
| Screen | Contents |
|---|---|
| **Start** | Title, four decorative faders (Drums, Bass, Riddim, Horns), song name, **Start Dubbing**, **How to play**, language picker, one-line about. Prefetches the first audio piece of each stem while shown. |
| **Mixer** (main) | Header tabs: **Synare**, **SE-1**, **FX**. Transport card: Play/Pause, time `0:00 / 4:02`, seek bar, song title, weak-signal badge, links **How to play** and **Song DNA**. Four channel strips. Two trigger pads (Siren, Synare) each with a level knob. Echo card: Time, Repeats, Return bars. |
| **FX → Echo tab** | Tempo readout (song · BPM). **Sync / Free**. Note length: 1/16, 1/16., 1/8, 1/8., 1/4, 1/4., 1/2, 1/2., 1 bar. **Width**: Mono / Stereo / Ping-pong. **Tone**: Echo bass, Echo treble (bipolar, −5..+5). **Echo to verb** (0–100). **Echo volume** (0–150, linked to mixer Return). Help notes under each. `?` opens the Echo tour. **Mixer** tab returns. |
| **FX → Verb tab** | Reverb select (5 IRs: Reverbulator, Fisher Space Expander, AKG BX20, RealTube, EMT 140; level-matched with dB trims). **Decay** bar with a drawn envelope of the IR and a cut-off line (0.3 s → full). **Low cut** (off, 70…7.5K, stepped). **High cut** (off, 10K…250, stepped). **Return** (0–150). `?` opens the Verb tour. |
| **Synare / SE-1** | A separate page (`../fxtrinity/?embed=1&inst=…`) in a hidden iframe, preloaded when the network is idle, shown over the mixer. It has no audio of its own: it posts control messages to the mixer's engine. Synare: XY pad (tap = hit, higher = harder; X = pitch 70 Hz–2.5 kHz log; drag Y = decay; second finger = LFO wobble, depth by finger distance). SE-1: Trig (TOGGLE/MOM), Base 1–3, Mode 1–4, Beat OFF/1–3, Signal and Siren hold buttons, preset slots (tap recall, hold store), echo Delay/Repeats/Dry-wet, volume. |
| **Song DNA** | Bottom sheet: credits per role with Instagram/Spotify/web links; "Open as a page to share". |
| **How to play** | Guided tour: spotlight on the real control, tip card, animated "ghost finger" (tap, left-right, up-down), Back/Next/count, language picker. Controls stay live during the tour. Opens on first visit. Three tours: Mixer (16 steps), Echo (7), Verb (6). |
| **Turn your phone** | Overlay in landscape on short touch screens. |

### 1.3 Channel strip (×4)
- **Cut** knob (bipolar, stepped ±10): left = low-pass steps 10K…250, right = high-pass steps 70…7.5K, centre off. Models a passive Altec 9069B: two biquads per side (resonant pair + far pole), an asymmetric tanh soft-clip in circuit only when stepped.
- **Echo** send knob (post-fader, curve `x^1.5`).
- **Verb** send knob (post-fader, `x^2 × 1.5`).
- **Fader** (vertical, `x^2` gain, top = unity).
- **MUTE** button (8 ms ramp).
- Label.
- All knobs: vertical drag (0.8 units/px), **double-tap = home** (Cut → centre, sends → 0, fader → top).

### 1.4 Signal flow
```
stem piece → fade gain → channel in → [clean | soft-clip] → HP1 → HP2 → LP1 → LP2 → fader → mute ─┬→ master
                                                                                                   ├→ verb send → verb in
                                                                                                   └→ echo send → echo bus
echo bus + Synare + Siren → AudioWorklet (tape echo, 1 or 2 tapes) ─┬ dry instruments → master
                                                                    └ echo out → Return → master
                                                                                └→ Echo-to-verb → verb in
verb in → Convolver (IR faded to Decay) → Low cut → High cut → Return → master
master (0.7) → limiter (−3 dB, 20:1, 2 ms) → out
```
Echo time: Sync = `60000 / BPM × beats`; Free = 60–600 ms. Repeats 0–10, runaway above 9. Ping-pong forces per-tape repeats to 0 and cross-feeds.

### 1.5 Audio delivery (the clever part)
- Each stem is pre-cut into **10 s pieces** with 0.25 s padding; neighbours crossfade over the pad. File name `stems/<stem>_NN.m4a`.
- Three quality tiers: `stems/` 128 kbps, `stems_lo/` 64, `stems_vlo/` ~32. Sample-aligned, so tier switches are seamless.
- Starting tier from `navigator.connection`. Measures throughput across all downloads; steps down below 1.5× need, up above 2× the next tier's need.
- Looks 16 s ahead. Keeps only pieces near the playhead in memory.
- **Rescue**: a download running much slower than expected, or due in <6 s, is aborted and refetched from a lighter tier (<4 s → lightest).
- If the due piece is missing, holds on "Loading" and resumes from the same spot (no silent skip). 3 retries with backoff.
- Badge shows "Weak signal / Lighter sound" while a lighter piece plays.
- 12 ms fade-in on mid-song starts and fade-out on stop (no clicks).

### 1.6 Mobile and touch
- Viewport `user-scalable=no, viewport-fit=cover`; `100dvh`; safe-area insets on all sides; `overscroll-behavior:none`.
- `touch-action:none` on controls; `preventDefault` on `touchmove`, `gesturestart/change`, `dblclick`, double-tap within 350 ms, `contextmenu`.
- One `control()` helper: Pointer Events with pointer capture, per-pointer state (multitouch: several faders at once), down/move/up, double-tap within 300 ms.
- Relative drag for Repeats (a tap can't throw it into runaway); absolute for Time/Return. Return snaps to 100 within ±5.
- **Speed test** at start: runs the echo engine for 0.1 s; slow phones get one tape (Mono only, Stereo/Ping-pong greyed) and `latencyHint:'playback'`.
- iOS: `navigator.audioSession.type='playback'` (plays with silent switch on); `AudioContext` created and resumed inside the tap; resume on any touch after an interruption; **Wake Lock** while playing.
- Large screens: scales UI by `--z` up to 1.7×. Landscape-phone overlay. `prefers-reduced-motion` respected.
- Keyboard: **Space** = play/pause (ignored in inputs and on the start screen).

---

## 2. What changes for "any 4 tracks"

| Reference | Ours |
|---|---|
| One fixed song, pre-cut on a server | Any 4 audio files per session, from device, URL, the library, or the stem splitter |
| Hard-coded BPM | BPM from file tags, auto-detect, tap tempo, or typed |
| Fixed names Drums/Bass/Riddim/Horns | Editable names and colours per slot; defaults Drums/Bass/Other/Vocals |
| Song DNA = fixed credits | Song info sheet: title, artist, per-stem credit and links, editable |
| Network tiers for a remote song | Local pieces built on import; tiers only for URL-loaded tracks |

---

## 3. Tech stack
- **Vite + TypeScript**, no UI framework (direct DOM, like the reference: lowest latency and smallest bundle on phones). Preact only if the library UI grows complex.
- **AudioWorklet** for echo, siren and drum synth; written as a separate TS module, built by Vite.
- **IndexedDB** (via `idb`) for library metadata; **OPFS** for audio pieces (fast, large quota).
- **WebCodecs** `AudioEncoder`/`AudioDecoder` where available; fallback `decodeAudioData` + WAV/raw Float32 pieces.
- **ONNX Runtime Web** (WebGPU, WASM fallback) for the stem splitter, in a Web Worker.
- **Vitest** for unit tests, **Playwright** (mobile emulation: iPhone, Pixel) for end-to-end and touch tests.
- **vite-plugin-pwa** for manifest and a service worker (offline app shell and cached models).

### Proposed layout
```
dub-studio/
  index.html
  src/
    main.ts
    audio/   context.ts graph.ts channel.ts filters.ts verb.ts limiter.ts
    worklet/ rig.worklet.ts tape-echo.ts siren.ts drum-synth.ts
    player/  piece-player.ts scheduler.ts
    loader/  import.ts decode.ts pieces.ts analyse.ts (bpm, loudness, align)
    split/   splitter.worker.ts model.ts
    library/ db.ts opfs.ts library-ui.ts export.ts
    ui/      control.ts knob.ts fader.ts bar.ts seg.ts strip.ts transport.ts fx-page.ts pads.ts tour.ts sheet.ts
    i18n/    en.json (others later)
    state/   store.ts defaults.ts
  tests/  e2e/
```

---

## 4. Phases

### Phase 1: Studio core (recreate the reference with 4 local files)
1. Scaffold Vite/TS, PWA manifest, viewport and safe-area CSS, design tokens (our own palette and fonts).
2. `control()` pointer helper with capture, multitouch, double-tap; global touch guards (no zoom, no scroll, no long-press).
3. Widgets: knob (uni/bipolar, stepped), vertical fader, horizontal bar (absolute/relative, snap), segmented picker, select.
4. Audio graph: 4 channels (stepped HP/LP with resonant pair + soft-clip), post-fader sends, master + limiter.
5. AudioWorklet rig: **our own** tape echo (1 or 2 tapes, mono/stereo/ping-pong, repeats with runaway, wow/flutter, saturation, bass/treble in the feedback loop), siren synth (3 bases, 4 modes, LFO beat off/1–3, Signal/Siren holds, toggle/MOM), Synare-style drum synth (pitch-dive, decay, wobble LFO, velocity). ScriptProcessor fallback.
6. Verb: Convolver with selectable IRs (we source or record our own, CC0/licensed), decay fade-out of the IR, stepped low/high cut, return. Envelope drawing.
7. Mixer screen: strips, trigger pads with level knobs, echo card, transport (play/pause, seek with scrub, time).
8. FX page: Echo and Verb tabs, all controls and notes; Echo volume ↔ Return linked.
9. Instrument pages (Synare pad, SE-1 panel) as in-app overlays (no iframe needed), song keeps playing, presets in storage.
10. Start screen, Song info sheet, landscape overlay, desktop scaling, Space key, reduced motion.
11. Mobile robustness: iOS audio session, resume on touch, wake lock, speed test → one-tape mode and latency hint.
12. Persist all settings; first-visit defaults.
13. How-to-play tour engine (spotlight, tip, ghost finger tap/lr/ud/two, live controls) with Mixer, Echo, Verb, Synare, SE-1 tours. English first; i18n structure ready.

Interim loader: pick 4 files → `decodeAudioData` → play whole buffers. Enough to test the studio.

**Done when:** all controls in §1 work on iPhone Safari and Android Chrome, with 4 local files, no clicks, no page scroll/zoom.

### Phase 2: Optimized per-stem track loader
Goal: load any 4 files fast, play smoothly on a phone, keep memory low.
1. **Per-slot loader UI**: each strip gets a load target (tap = file picker, drag-drop on desktop, paste URL, pick from library). Shows name, duration, progress, error.
2. **Decode** in a Worker with WebCodecs where supported (streams, no full-file copy); else `decodeAudioData`. Accept mp3, m4a/aac, wav, flac, ogg/opus, aiff (format check up front).
3. **Normalise**: resample to the context rate; mono stems kept mono (half memory); loudness analysis (LUFS) for an optional gain trim so faders start balanced.
4. **Align**: common length (pad shorter stems with silence); optional offset nudge per stem (ms) with a waveform view; auto-align by cross-correlating onsets.
5. **Tempo**: read BPM from tags; else onset-based BPM detection on the drum-like stem; tap-tempo and manual override. Drives echo Sync.
6. **Piece the audio**: cut each stem into 10 s pieces with 0.25 s pad (same crossfade scheme as the reference), encode to Opus/AAC via WebCodecs (fallback Float32/Int16 raw), store in OPFS. Write a manifest (`dur, seg, pad, n, bpm, stems[]`).
7. **Piece player**: the reference scheduler: look-ahead 16 s, decode near the playhead only, evict behind it, crossfade pads, 12 ms fades on jumps/stops, hold-on-missing. Memory ≈ 4 stems × ~3 pieces, regardless of song length.
8. **Remote URLs**: stream with range requests; if a host serves tiers, use the bandwidth meter and rescue logic; otherwise download once into OPFS.
9. **Waveform thumbnails** per strip (peaks computed during piecing).
10. Tests: 10-minute stereo stems on a mid-range Android stay under a set memory budget (target <150 MB); seek latency <300 ms from OPFS.

### Phase 3: Stem splitter
Goal: drop in one full mix, get 4 stems in the 4 slots.
1. **Model**: Demucs v4 (htdemucs, 4 sources: drums, bass, other, vocals) exported to ONNX; quantised variant for phones. Check the licence (Demucs is MIT) and host the weights ourselves.
2. **Runtime**: ONNX Runtime Web in a Worker; WebGPU first, WASM-SIMD-threads fallback (needs COOP/COEP headers for SharedArrayBuffer).
3. **Chunked inference**: overlapping windows (e.g. 7.8 s with overlap-add) so memory stays flat; progress bar with time remaining; cancel; resumable (chunks saved to OPFS).
4. **Output** goes straight into the Phase 2 pipeline (pieces + manifest). Default mapping: Drums, Bass, Other, Vocals.
5. **Device check**: estimate time before starting; warn on low-RAM phones; option to run on desktop or (later) a server endpoint.
6. Model cached by the service worker after first download (~80 MB, ~20–40 MB quantised).
7. Tests: known-input separation sanity (energy per stem), no crash on 6-minute input on a mid-range phone.

### Phase 4: Library
1. **Song entries** in IndexedDB: title, artist, BPM, key, duration, cover, per-stem name/colour/credit/links, created/last-played, source (files / URL / split).
2. **Audio** in OPFS (pieces + peaks). Storage meter; `navigator.storage.persist()` request; delete/cleanup.
3. **Mixes**: save a mixer snapshot per song (faders, mutes, cuts, sends, FX, verb choice) and recall it; multiple named snapshots.
4. **Library UI**: list/grid, search, sort, open (loads 4 stems in one tap), rename, edit info, delete.
5. **Import/Export**: one `.zip` (manifest JSON + stems) to move songs between devices; share-sheet on mobile (`navigator.share` with files).
6. Song info sheet replaces Song DNA, editable, with "share page" later.
7. Optional later: record the live dub to a file (MediaRecorder on the master) and keep takes in the library.

---

## 5. Quality bar (all phases)
- Audio: no clicks on any parameter change (ramps ≥8 ms); limiter on master; worklet never allocates per sample.
- Touch: multiple controls at once; no accidental page scroll, zoom or text select; 44 px minimum targets.
- Latency: `interactive` hint on capable phones; pads respond in one render quantum.
- Accessibility: roles and labels on all controls, keyboard operable on desktop, reduced motion.
- Perf budget: app shell <150 KB gzipped (excluding model and IRs).
- Test matrix: iOS Safari (latest −1), Android Chrome, desktop Chrome/Firefox/Safari.

## 6. Open questions
1. Hosting: static host is fine for Phases 1–2, 4. Phase 3's WASM threads need COOP/COEP headers. Which host?
2. Reverb IRs: record/licence our own, or use CC0 IRs?
3. Branding: name, colours, font for our version?
4. Splitter on phones: in-browser only, or also a server option for slow devices?
