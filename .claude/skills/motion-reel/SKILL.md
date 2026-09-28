---
name: motion-reel
description: Use when making a motion-graphics video — a product showreel, a promo clip, a vertical TikTok/Reels piece, an animated title card, or any "make me a video" request that is design rather than footage. Builds the piece as a single HTML canvas driven by a pure function of time, previews it as a contact sheet, then renders real frames straight into ffmpeg to produce an .mp4 at any aspect ratio. Covers the determinism rules that make frame capture possible, the craft techniques (temporal motion blur, two-pass glow, tiled film grain), and the specific bugs that silently ruin a render.
when_to_use: "направи видео", "make a video", "showreel", "промо клип", "TikTok видео", "reels", "motion graphics", "animated intro", "title card", "render an mp4", or any request to animate a brand, product or set of numbers.
---

# Motion Reel — design a video, render it to mp4

This is for motion **design**, not generated video. The piece is a canvas
drawn by code; the output is a real `.mp4` that can be uploaded anywhere.

Reach for a different tool when the request needs photographic footage,
actors, or a talking head. Reach for this when the subject is a product,
a brand, numbers, or type.

## The one rule everything else follows from

**Every frame is a pure function of `t`.**

No `Math.random`. No `Date.now` inside drawing. No CSS keyframes or
transitions. No `requestAnimationFrame` accumulation. The frame at 91.4
seconds must look identical whether it is played live or pulled out alone
for the encoder.

This is not fastidiousness. Frames are captured one at a time by seeking
to a timestamp; anything that varies between two calls at the same `t`
becomes flicker in the finished file, and flicker is not fixable in post.

Randomness comes from a seeded hash, and **each element carries its own
seed** rather than pulling from a shared stream — so adding a particle
does not reshuffle the others.

## Building one

1. **Copy `assets/core.js` and `assets/render.mjs`** next to your work, and
   start the page from `assets/template.html`. Core carries time, easing,
   seeded noise and the drawing helpers; it knows nothing about any brand.

2. **Set size, palette and fonts before the scene module is imported.**
   `setSize(1080, 1920)` for vertical, `setSize(1920, 1080)` for wide.
   Scenes must read `W`/`H` *inside* their draw function, never at module
   top level, or they capture the previous piece's dimensions.

3. **Write scenes as rows of `seg(t, from, to)`**, not a state machine.
   Each returns 0→1 between two timestamps and clamps outside them.

4. **Look before you render.** `node render.mjs --sheet 3 12 24 40` writes
   single frames to `sheet/`; stitch them into one contact sheet and read
   it. Rendering 4 500 frames to discover a scene is broken costs eight
   minutes; the sheet costs four seconds.

5. **Render.** `node render.mjs` for the whole thing, `node render.mjs 40 62`
   for one stretch. Duration comes from `window.__DUR` on the page, so the
   renderer never has to be told.

## Capture: read the buffer, not the screen

Take frames with `canvas.toDataURL()`, **never** with a screenshot of the
canvas element. The element screenshot goes through page layout and returns
what is on screen, where the canvas is scaled to fit a window — it is the
wrong size and, in a headless browser, sometimes silently the wrong region.
`toDataURL` reads the backing store: exactly what was drawn.

Frames go straight into ffmpeg's stdin as `image2pipe`. 4 500 JPEGs on disk
is 1.5 GB that then has to be read back.

## Craft that is worth the cost

**Motion blur is time, not a filter.** Draw the moving element 5–7 times
within one frame at sub-frame offsets, each at `1/n` alpha (`smear()` in
core). Expensive, so put it only on things that actually fly.

**Glow is two strokes, not `shadowBlur`.** A wide transparent pass under a
narrow opaque one. Canvas recomputes a shadow per shape and at 1080p that
alone can double the frame time.

**Grain is eight pre-made tiles**, drawn at a per-frame offset — not noise
computed per pixel. It does a second job: on a dark piece it dithers the
gradients, which is why h264 comes out without banding.

**Load the fonts before the first frame.** `await document.fonts.load(...)`
for each weight, then `document.fonts.ready`, and only then set
`window.__ready = true`. Otherwise the opening seconds render in the
fallback face and the switch is visible in the file.

## Bugs that ruin a render silently

These all happened. Each one shipped a frame that looked plausible.

- **A beat that applies unconditionally overwrites state before it starts.**
  If a later beat says "put everything back", and it runs from t=0 with
  progress 0, it will still assign its start values. Skip beats with
  `if (p <= 0) continue`, and lerp from the *current* value, not a
  recorded one.

- **Label and position out of sync.** If a thing dwells then flies, decide
  whether the flight is at the start or the end of the dwell — and make
  the caption agree. Getting this backwards names the place it just left.

- **A zero-length arc with a round cap draws a dot.** Every ring that has
  not started yet is a speck in the corner. Return early when the sweep
  is under ~1e-4.

- **A dash used to draw a path on must be longer than the perimeter.**
  `setLineDash([len * p, len])` with `len` under the path length leaves
  the last stretch permanently undrawn.

- **A slide creates horizontal overflow.** A view entering from ±16px
  sticks out and makes the page draggable sideways. `overflow-x: clip` on
  the wrapper — not `hidden`, which becomes a scroll container and breaks
  sticky children.

- **`position: fixed` inside an animated element** is measured against that
  element, not the viewport. Keep fixed chrome outside anything that
  transforms.

## Checking the result

Pull frames back **out of the finished mp4** with ffmpeg and look at them.
The canvas and the encode are two different things; banding, colour shifts
and dropped detail only appear after encoding.

```
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,nb_frames \
  -show_entries format=duration -of default=noprint_wrappers=1 out.mp4
```

Frame count and duration must be exactly what was asked for. `nb_frames`
short of `duration × fps` means frames were dropped in the pipe.

## Format follows the channel

A 150-second horizontal film is a showreel: its job is to show craft to
someone watching closely. A product clip for a feed is 9:16, 15–25 seconds,
one idea, and it assumes no sound. Do not make the second one long because
the first one was.

Leave the bottom ~18% of a vertical piece quiet — the platform's own
interface sits there.

## Assets

- `assets/core.js` — time, easing, seeded noise, drawing helpers, grain,
  glow, temporal blur. Brand-agnostic: `setSize`, `setPalette`, `setFonts`.
- `assets/render.mjs` — seek, capture, pipe to ffmpeg. Also `--sheet`.
- `assets/template.html` — a working page with the clock, the scrub bar,
  the grain tiles and the font gate already wired.

`render.mjs` resolves `playwright` from a host project via `PW_HOST` so the
clip itself needs no `node_modules`.
