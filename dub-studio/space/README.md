---
title: Dub Splitter
emoji: 🎚️
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

Stem splitter for Pocket Dub Studio. Runs Demucs htdemucs_6s (by Meta) on CPU.

- `POST /split` (body: the song file) -> `{id}`
- `GET /status/{id}` -> `{status, position?, progress?, error?, stems?}`
- `GET /stem/{id}/{name}` -> MP3
- `POST /cancel/{id}`
- `GET /health` -> `{ok:true}`

Songs and parts are deleted within an hour.
