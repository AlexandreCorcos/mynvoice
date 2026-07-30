import Link from "next/link";
import { cn } from "@/lib/utils";

/* =========================================================================
   MYNVOICE brand.

   The mark is an M whose central V is brass. It carries the name twice —
   the M of MYNVOICE, and a V for inVoice that doubles as a downward arrow,
   money arriving. Two colours, three strokes, which is what it takes to
   still read at 16px in a browser tab.

   Both pieces are drawn here rather than loaded as images:

   * The mark is inline SVG — no network request, no blur at any size, and
     it recolours per surface instead of shipping one PNG per background.
     It is built from plain filled paths with no `clipPath`, so it needs no
     generated ids (which would break server rendering) and survives being
     pasted into an email or a PDF renderer.
   * The wordmark is real text in Inter, which the app already loads. A
     wordmark rasterised into a PNG is soft on every display it wasn't
     exported for; this one is exact everywhere and inherits the theme.

   The PNG assets under /public are generated *from these same shapes* for
   the places that cannot run React — the OG image and the favicons. If the
   geometry below changes, regenerate them.
   ========================================================================= */

const GRAPHITE = "#1C1917";
const BRASS = "#8A6A3D"; // brass on a light surface
const BRASS_ON_DARK = "#C79A5B"; // brass on graphite
const WHITE = "#FFFFFF";

/* The M, on a 512 grid: two stems at x=128 and x=330, 54 wide, running from
   y=150 to y=362, and a V between them.

   The V is the outline of a 54-wide stroke along (150,110) → (256,300) →
   (362,110), flattened at y=150 — written out as a polygon so the mark needs
   no `clipPath` and therefore no generated ids.

   Its arms deliberately run *under* the stems, which are drawn on top. An
   earlier version had the V start at the stems' inner edges instead, which
   left a sliver of background between them: the mark then read as "I V I"
   rather than as an M. The letter has to be one connected shape. */
const V_PATH = "M141 150 L203 150 L256 245 L309 150 L371 150 L256 355 Z";

type MarkVariant = "tile" | "bare" | "ink";

const MARK_COLOURS: Record<MarkVariant, { stem: string; v: string; tile?: string }> = {
  /** Graphite tile — app icon, favicon, anywhere the mark stands alone. */
  tile: { stem: WHITE, v: BRASS_ON_DARK, tile: GRAPHITE },
  /** No tile, for surfaces that are already graphite (the sidebar). */
  bare: { stem: WHITE, v: BRASS_ON_DARK },
  /** No tile, for light surfaces. */
  ink: { stem: GRAPHITE, v: BRASS },
};

/* The tile needs an icon's safe margin around the letter. Bare, that margin
   is just empty space that makes the M read lighter than the wordmark beside
   it — so the untiled variants crop to the letter plus a hair. `size` then
   means the height of the M itself, which is what a caller is thinking of. */
const BARE_BOX = { x: 116, y: 138, w: 280, h: 236 };

export function LogoMark({
  size = 36,
  variant = "tile",
  className,
}: {
  size?: number;
  variant?: MarkVariant;
  className?: string;
}) {
  const c = MARK_COLOURS[variant];
  const tiled = Boolean(c.tile);
  const viewBox = tiled
    ? "0 0 512 512"
    : `${BARE_BOX.x} ${BARE_BOX.y} ${BARE_BOX.w} ${BARE_BOX.h}`;

  return (
    <svg
      viewBox={viewBox}
      width={tiled ? size : Math.round((size * BARE_BOX.w) / BARE_BOX.h)}
      height={size}
      role="img"
      aria-label="MYNVOICE"
      className={className}
      style={{ display: "block" }}
    >
      {c.tile ? <rect width="512" height="512" rx="116" fill={c.tile} /> : null}
      <path d={V_PATH} fill={c.v} />
      <rect x="128" y="150" width="54" height="212" rx="6" fill={c.stem} />
      <rect x="330" y="150" width="54" height="212" rx="6" fill={c.stem} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

type LogoProps = {
  /** "dark" = brass + ink, for light backgrounds · "white" = for graphite */
  variant?: "dark" | "white";
  /** Cap height in px. The wordmark is text, so this is its font size. */
  height?: number;
  /** Wrap in a link (defaults to "/"); pass null to render bare. */
  href?: string | null;
  className?: string;
};

/**
 * The wordmark. "MY" is brass and heavier, "nvoice" is ink and lighter —
 * the split is what makes the portmanteau readable at a glance.
 */
export function Logo({
  variant = "dark",
  height = 28,
  href = "/",
  className,
}: LogoProps) {
  const word = (
    <span
      aria-label="MYNVOICE"
      className={cn("inline-block whitespace-nowrap leading-none", className)}
      style={{ fontSize: height, letterSpacing: "-0.035em" }}
    >
      <span
        style={{ fontWeight: 800, color: variant === "white" ? BRASS_ON_DARK : BRASS }}
      >
        MY
      </span>
      <span style={{ fontWeight: 600, color: variant === "white" ? WHITE : GRAPHITE }}>
        nvoice
      </span>
    </span>
  );

  if (href === null) return word;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="MYNVOICE home">
      {word}
    </Link>
  );
}

/** Mark + wordmark, spaced the way they should always be spaced. */
export function LogoLockup({
  variant = "dark",
  height = 28,
  href = "/",
  className,
}: LogoProps) {
  const inner = (
    <>
      <LogoMark
        size={Math.round(height * 1.55)}
        variant={variant === "white" ? "bare" : "tile"}
      />
      <Logo variant={variant} height={height} href={null} />
    </>
  );

  const cls = cn("inline-flex items-center gap-2.5", className);
  if (href === null) return <span className={cls}>{inner}</span>;
  return (
    <Link href={href} className={cls} aria-label="MYNVOICE home">
      {inner}
    </Link>
  );
}
