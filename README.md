# Chess Sound Lab

Interaction prototype for testing sound design for the Take Take Take chess app.
Play chess on a board styled after their default "Royal" theme, and swap, tune
and A/B compare the sounds each chess event triggers. Everything runs client-side.

## Run

```
npm install
npm run dev
```

Build for Vercel (or any static host) with `npm run build`; the output is `dist/`.
Vercel auto-detects Vite, no config needed.

## Adding sounds

Drop WAV/MP3/OGG files anywhere under `public/sounds/`, using one sub folder per
sound set:

```
public/sounds/
  original/        ← the files Take Take Take shipped
  concept-a/
  concept-b/
```

Files are discovered automatically at dev/build time (`plugins/soundManifest.ts`)
and appear in every event dropdown, grouped by folder, and in the Sample library.
The dev server reloads when files are added or removed. File names become labels
(`move-soft.wav` → "Move soft").

### Uploading in the browser

The Sample library has an "Add sounds to set" box: pick files or drag audio
files onto the panel. They are decoded immediately, stored in the browser
(IndexedDB) so they survive reloads, and show up in every event dropdown under
the set name you typed. Uploads live only in that browser; copy the files into
`public/sounds/<set>/` and push to make them permanent for everyone.

## Events

Move · White, Move · Black (so player 1 and player 2 can have different move
sounds), Capture, Castle, Promotion, Check, Checkmate, Illegal move, Game start.

Each event has: sample dropdown, preview, enable, volume and a delay offset in ms.
Every sample is decoded once into memory and played through the Web Audio API,
so playback is scheduled sample-accurately with no load delay.

## Presets

Original / Concept A / Concept B (add, rename, duplicate, delete, export/import as
JSON from the ⋯ menu). Presets and settings persist in localStorage.
Switch presets with keys 1–9 and press Space to replay the last event with the
current preset for a quick A/B on the exact same moment.

Each move plays one sound: the highest-priority event that has a sample
(checkmate → check → promotion → castle → capture → move).

## Opponent

Under the board choose an opponent: *Off* (you play both sides), *Random mover*,
or *Stockfish 19* with a skill slider (0 = weakest, 20 = full strength) and a
side switch so the bot can play White or Black. Stockfish runs in a Web Worker
from `public/engine/` (the 1.8 MB "lite single-threaded" WASM build, so no
special headers are needed). Update it with `npm run engine:update` after
bumping the `stockfish` dev dependency.

Shortcuts: Z undo · R reset · F flip · M mute · 1–9 preset · Space replay last.

## Structure

```
plugins/soundManifest.ts   scans public/sounds → virtual:sound-manifest
src/audio/engine.ts        Web Audio preload + playback
src/audio/library.ts       reactive sample list (manifest + uploads)
src/audio/uploads.ts       IndexedDB storage for browser uploads
src/sound/events.ts        event ids, labels, priority   ← add new events here
src/sound/presets.ts       default mapping + preset types
src/sound/useSoundConfig.ts  presets/settings state (localStorage)
src/chess/useChessGame.ts  chess.js game state, click/drag moves, opponent bot
src/chess/stockfish.ts     UCI wrapper around the Stockfish worker
src/chess/detectEvents.ts  chess.js move → event ids
src/components/            Board, EventPanel, PresetBar, SampleLibrary, …
```

Notes: pawns auto-promote to a queen. The Take Take Take set has no illegal-move
sound, so that event starts as "no sound" until you assign one.
