import Image from "next/image";
import Link from "next/link";

// Wordmark intrinsic size (generated asset): 475 x 240 (tight-cropped)
const WORDMARK_RATIO = 475 / 240;

type LogoProps = {
  /** "dark" = petrol ink (light backgrounds) · "white" = white ink (dark backgrounds) */
  variant?: "dark" | "white";
  /** rendered height in px; width is derived from the wordmark ratio */
  height?: number;
  /** wrap in a link (defaults to "/"); pass null to render bare */
  href?: string | null;
  className?: string;
  priority?: boolean;
};

export function Logo({
  variant = "dark",
  height = 28,
  href = "/",
  className = "",
  priority = false,
}: LogoProps) {
  const src =
    variant === "white" ? "/logo-mynvoice-white.png" : "/logo-mynvoice.png";
  const width = Math.round(height * WORDMARK_RATIO);

  const img = (
    <Image
      src={src}
      alt="MYNVOICE"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ height, width: "auto" }}
    />
  );

  if (href === null) return img;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="MYNVOICE home">
      {img}
    </Link>
  );
}

type LogoMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** The square brand mark (rounded petrol tile, white "M", coral tittle). */
export function LogoMark({ size = 36, className = "", priority = false }: LogoMarkProps) {
  return (
    <Image
      src="/mark-512.png"
      alt="MYNVOICE"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
