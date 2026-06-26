"""
Generate MYNVOICE brand assets:
  - Transparent wordmark (petrol ink)   -> frontend/public/logo-mynvoice.png
  - White wordmark (for dark surfaces)  -> frontend/public/logo-mynvoice-white.png
  - Favicon mark (M monogram + coral dot tittle) as .ico + apple-icon + icon png
Run from repo root:  python scripts/gen_brand_assets.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "logo", "mynvoiceB.png")
PUBLIC = os.path.join(ROOT, "frontend", "public")
APPDIR = os.path.join(ROOT, "frontend", "src", "app")

PETROL_DARK = (15, 76, 92)      # #0F4C5C
PETROL_TOP = (20, 88, 107)      # lighter petrol for gradient top
PETROL_BOT = (11, 58, 71)       # deeper petrol for gradient bottom
CORAL = (255, 107, 107)         # #FF6B6B


# ---------------------------------------------------------------------------
# 1. Wordmark: white background -> transparent, preserving ink color + edges
# ---------------------------------------------------------------------------
def make_transparent(src_path):
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # whiteness: how close to pure white (255,255,255)
            mn = min(r, g, b)
            # alpha grows as pixel departs from white; boost so ink stays solid
            a = 255 - mn
            a = int(min(255, a * 1.6))
            px[x, y] = (r, g, b, a)
    return im


def autocrop(im, pad_ratio=0.01):
    """Crop tight to the inked pixels; keep only a hair of padding."""
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    pad = max(1, int(h * pad_ratio))
    out = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    out.paste(im, (pad, pad))
    return out


def to_white(im):
    """Replace ink color with white, keep alpha — for dark backgrounds."""
    r, g, b, a = im.split()
    white = Image.new("RGBA", im.size, (255, 255, 255, 0))
    white.putalpha(a)
    return white


def downscale_to_height(im, target_h):
    w, h = im.size
    if h <= target_h:
        return im
    ratio = target_h / h
    return im.resize((max(1, int(w * ratio)), target_h), Image.LANCZOS)


print("Processing wordmark...")
word = make_transparent(SRC)
word = autocrop(word)
word = downscale_to_height(word, 240)  # crisp for web, light weight
word.save(os.path.join(PUBLIC, "logo-mynvoice.png"))
print("  saved logo-mynvoice.png", word.size)

word_white = to_white(word)
word_white.save(os.path.join(PUBLIC, "logo-mynvoice-white.png"))
print("  saved logo-mynvoice-white.png", word_white.size)


# ---------------------------------------------------------------------------
# 2. Favicon / app mark — geometric bold "M" + coral tittle on petrol tile
#    Rendered at 4x then downscaled for clean anti-aliasing.
# ---------------------------------------------------------------------------
def rounded_rect_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def vgradient(size, top, bot):
    grad = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return grad.resize((size, size))


def draw_mark(size):
    S = size * 4  # supersample
    tile = vgradient(S, PETROL_TOP, PETROL_BOT).convert("RGBA")
    mask = rounded_rect_mask(S, int(S * 0.235))
    tile.putalpha(mask)

    d = ImageDraw.Draw(tile)

    # Bold "M" built from thick strokes with round joins/caps
    # Coordinates in 0..1 space mapped to tile, with padding
    pad = 0.30
    top = 0.30
    bot = 0.74
    midx = 0.50
    lx, rx = pad, 1 - pad
    pts = [
        (lx, bot),   # left bottom
        (lx, top),   # left top
        (midx, 0.585),  # middle valley
        (rx, top),   # right top
        (rx, bot),   # right bottom
    ]
    P = [(int(x * S), int(y * S)) for x, y in pts]
    stroke = int(S * 0.115)
    r = stroke // 2
    # segments
    for i in range(len(P) - 1):
        d.line([P[i], P[i + 1]], fill=(255, 255, 255, 255), width=stroke)
    # round joins + caps
    for (x, y) in P:
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 255))

    # Coral tittle (i-dot motif) hovering over the right stroke
    dot_r = int(S * 0.072)
    dx, dy = int(0.78 * S), int(0.205 * S)
    d.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=CORAL + (255,))

    return tile.resize((size, size), Image.LANCZOS)


print("Generating favicon set...")
sizes = [16, 32, 48, 64, 128, 180, 256, 512]
marks = {s: draw_mark(s) for s in sizes}

# Next.js app-router conventions
marks[512].save(os.path.join(APPDIR, "icon.png"))
marks[180].save(os.path.join(APPDIR, "apple-icon.png"))
marks[32].save(os.path.join(APPDIR, "favicon.ico"),
               sizes=[(16, 16), (32, 32), (48, 48)])
# Also drop a 512 mark in public for OG / PWA use
marks[512].save(os.path.join(PUBLIC, "mark-512.png"))
print("  saved icon.png, apple-icon.png, favicon.ico, mark-512.png")


# ---------------------------------------------------------------------------
# 3. Open Graph / social share banner (1200 x 630)
# ---------------------------------------------------------------------------
def find_font(names, size):
    from PIL import ImageFont
    candidates = [
        "C:/Windows/Fonts/" + n for n in names
    ] + ["/Library/Fonts/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


print("Generating OG banner...")
OGW, OGH = 1200, 630
og = vgradient(OGH, PETROL_TOP, PETROL_BOT).resize((OGW, OGH)).convert("RGBA")
od = ImageDraw.Draw(og)
# soft coral glow accent (top-right)
glow = Image.new("RGBA", (OGW, OGH), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([OGW - 360, -180, OGW + 120, 300], fill=CORAL + (60,))
from PIL import ImageFilter
glow = glow.filter(ImageFilter.GaussianBlur(80))
og.alpha_composite(glow)

# wordmark (white) centered upper
mark = Image.open(os.path.join(PUBLIC, "logo-mynvoice-white.png")).convert("RGBA")
mw = 560
mark = mark.resize((mw, int(mark.height * mw / mark.width)), Image.LANCZOS)
og.alpha_composite(mark, ((OGW - mark.width) // 2, 170))

# tagline
tag = "Your business. Your invoices."
sub = "Free & open-source invoicing  ·  Create, send, get paid"
f_tag = find_font(["arialbd.ttf", "Arialbd.ttf"], 46)
f_sub = find_font(["arial.ttf", "Arial.ttf"], 28)


def center_text(draw, y, text, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((OGW - w) // 2, y), text, font=font, fill=fill)


center_text(od, 360, tag, f_tag, (255, 255, 255, 255))
center_text(od, 432, sub, f_sub, (255, 255, 255, 170))
# coral underline accent
od.rounded_rectangle([OGW // 2 - 40, 506, OGW // 2 + 40, 514], radius=4, fill=CORAL + (255,))

og.convert("RGB").save(os.path.join(PUBLIC, "og-image.png"))
print("  saved og-image.png")
print("DONE")
