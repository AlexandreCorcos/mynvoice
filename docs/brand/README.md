# Brand

## The mark

An M whose central V is brass. It carries the name twice — the M of MYNVOICE,
and a V for inVoice that doubles as a downward arrow, money arriving.

Two colours and three strokes, because that is about what survives 16px in a
browser tab. Everything else was tried and discarded: a folded sheet reads as
the generic "file" icon, a bar-chart M stops being a letter, and a mark with
the letter half-coloured looks broken rather than deliberate.

The shapes live in [`frontend/src/components/brand/logo.tsx`](../../frontend/src/components/brand/logo.tsx),
not in an image file. The mark is inline SVG so it recolours per surface
instead of shipping one PNG per background, and the wordmark is real text in
Inter so it is exact at every size instead of soft everywhere it wasn't
exported for.

### Geometry

On a 512 grid: two stems at x=128 and x=330, 54 wide, from y=150 to y=362, and
a V between them. The V is the outline of a 54-wide stroke along
(150,110) → (256,300) → (362,110), flattened at y=150.

It is written as a polygon rather than a stroked line so the mark needs no
`clipPath`, and therefore no generated ids — which would break server
rendering and would not survive being pasted into an email.

**The V's arms run under the stems on purpose.** An earlier version started
the V at the stems' inner edges, which left a sliver of background between
them; the mark then read as "I V I" rather than as an M. The letter has to be
one connected shape.

## Regenerating the PNGs

The rasters exist only for the places React can't reach — favicons, the OG
card, and email. They are generated from the same geometry by
[`generate-assets.html`](generate-assets.html), one node per asset, captured
with Playwright element screenshots:

```js
await page.goto('file:///…/docs/brand/generate-assets.html')
await page.waitForFunction(() => document.title === 'READY')   // fonts loaded
await (await page.$('#mark512')).screenshot({ path: '…', omitBackground: true })
```

| Node | Goes to | Transparent |
|---|---|---|
| `#mark512` | `public/mark-512.png`, `src/app/icon.png` | yes |
| `#apple` | `src/app/apple-icon.png` | **no** |
| `#fav32`, `#fav16` | combined into `src/app/favicon.ico` | yes |
| `#word-dark`, `#word-white` | `public/logo-mynvoice*.png` | yes |
| `#og` | `public/og-image.png` | no |

The `.ico` is assembled with Pillow from the two hand-tuned sizes rather than
one downscale, so each keeps its own corner radius:

```python
f32.save("favicon.ico", format="ICO", sizes=[(16,16),(32,32)], append_images=[f16])
```

### Three things that go wrong

**Rounded corners come out opaque.** Element screenshots need
`omitBackground: true`, or the area outside the tile's radius is filled with
the page background — white notches on a dark browser tab.

**`rx` is in viewBox units.** It scales with the 512 grid, not with the output
size, so `rx: 6` on a 32px favicon renders as 0.4px — a square. The favicons
use `rx: 100` and `rx: 88` to keep roughly the tile's 22% radius.

**Light text on graphite exports with colour fringes.** Chrome on Windows uses
DirectWrite and ignores `-webkit-font-smoothing: antialiased`. Promoting the
node to its own compositing layer with `transform: translateZ(0)` forces
greyscale antialiasing.

## The Apple icon is square on purpose

iOS applies its own rounded mask. Baking our radius in as well leaves dark
slivers in the corners, so `#apple` renders full-bleed with `rx: 0`.
