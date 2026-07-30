"use client";

/* =========================================================================
   Landing motion primitives.

   Everything the marketing page needs to move, in one place. Each primitive
   degrades to a static equivalent when the visitor asks for reduced motion,
   so the page is never a wall of jitter for people who can't take it.

   House rules that apply to every primitive here:
   · animate transform / opacity only — never width, height or top/left
   · brass is a highlight, never a large fill (see CLAUDE.md)
   · nothing loops faster than ~6s; ambient motion should be barely noticed
   ========================================================================= */

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  animate,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* Our house easing — a long, confident settle. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

/**
 * `prefers-reduced-motion`, but hydration-safe.
 *
 * The raw hook reports `false` during SSR and the real value on the client,
 * so any component that changes its markup based on it mismatches on
 * hydration for the very people it's meant to help. Deferring to after mount
 * keeps the first client render identical to the server's.
 */
export function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

/* ------------------------------------------------------------------ */
/* Reveal — the workhorse scroll-in                                    */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  y = 22,
  blur = true,
  once = true,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  blur?: boolean;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useCalmMotion();

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: EASE_OUT }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* MaskText — words rise out of a clipped line                         */
/* ------------------------------------------------------------------ */

export type MaskWord = string | { w: string; className?: string; br?: boolean };

export function MaskText({
  words,
  as: Tag = "span",
  className,
  delay = 0,
  stagger = 0.06,
  duration = 0.95,
  once = true,
}: {
  words: MaskWord[];
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
}) {
  const reduce = useCalmMotion();

  const normalised = words.map((w) =>
    typeof w === "string" ? { w, className: undefined, br: false } : w
  );

  if (reduce) {
    return (
      <Tag className={className}>
        {normalised.map((word, i) => (
          <span key={i}>
            <span className={word.className}>{word.w}</span>
            {word.br ? <br /> : i < normalised.length - 1 ? " " : null}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <motion.span
        className="inline"
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: "-70px" }}
        transition={{ staggerChildren: stagger, delayChildren: delay }}
      >
        {normalised.map((word, i) => (
          <span key={i}>
            {/* the clip window: negative margin keeps descenders from being cut */}
            <span className="inline-flex overflow-hidden pb-[0.14em] mb-[-0.14em] align-bottom">
              <motion.span
                className={cn("inline-block will-change-transform", word.className)}
                variants={{
                  hidden: { y: "112%", opacity: 0 },
                  visible: { y: "0%", opacity: 1 },
                }}
                transition={{ duration, ease: EASE_OUT }}
              >
                {word.w}
              </motion.span>
            </span>
            {word.br ? <br /> : i < normalised.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Magnetic — the pointer tugs the element towards itself              */
/* ------------------------------------------------------------------ */

export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalmMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 });

  if (reduce) return <div className={cn("inline-block", className)}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Tilt — 3D parallax card driven by the pointer                       */
/* ------------------------------------------------------------------ */

type TiltContext = { rx: MotionValue<number>; ry: MotionValue<number> };

export function Tilt({
  children,
  className,
  max = 9,
  perspective = 1400,
  glare = false,
}: {
  children: ReactNode | ((ctx: TiltContext) => ReactNode);
  className?: string;
  max?: number;
  perspective?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalmMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 140, damping: 20, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 140, damping: 20, mass: 0.5 });

  const ry = useTransform(sx, [0, 1], [-max, max]);
  const rx = useTransform(sy, [0, 1], [max, -max]);

  const glareX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(sy, [0, 1], ["0%", "100%"]);
  const glareBg = useMotionTemplate`radial-gradient(600px circle at ${glareX} ${glareY}, rgba(255,255,255,0.16), transparent 45%)`;

  const body = typeof children === "function" ? children({ rx, ry }) : children;

  if (reduce) return <div className={className}>{body}</div>;

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {body}
        {glare ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: glareBg }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

/** Push a child forward in a Tilt's 3D space. */
export function Depth({
  z = 40,
  children,
  className,
}: {
  z?: number;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useCalmMotion();
  return (
    <div
      className={className}
      style={reduce ? undefined : { transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spotlight — a soft brass light that tracks the cursor over a card   */
/* ------------------------------------------------------------------ */

export function Spotlight({
  children,
  className,
  size = 380,
  tint = "rgba(199,154,91,0.16)",
  border = true,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  tint?: string;
  border?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${x}px ${y}px, ${tint}, transparent 70%)`;
  const ring = useMotionTemplate`radial-gradient(${size / 1.6}px circle at ${x}px ${y}px, rgba(199,154,91,0.55), transparent 60%)`;

  return (
    <div
      ref={ref}
      className={cn("group/spot relative", className)}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-9999);
        y.set(-9999);
      }}
    >
      {/* the lit border sits under the card body, showing only 1px at the edge */}
      {border ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{ background: ring }}
        />
      ) : null}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: bg }}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — infinite scroll that reacts to scroll velocity            */
/* ------------------------------------------------------------------ */

const wrapValue = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

export function Marquee({
  children,
  baseVelocity = -2.2,
  className,
  repeat = 4,
}: {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
  repeat?: number;
}) {
  const reduce = useCalmMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smooth = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smooth, [0, 1200], [0, 3], { clamp: false });
  const directionRef = useRef(1);

  const x = useTransform(baseX, (v) => `${wrapValue(-100 / repeat, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = directionRef.current * baseVelocity * (delta / 1000);
    const f = velocityFactor.get();
    if (f < 0) directionRef.current = -1;
    else if (f > 0) directionRef.current = 1;
    moveBy += moveBy * f;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={cn("relative flex overflow-hidden", className)}>
      <motion.div className="flex flex-none whitespace-nowrap" style={{ x }}>
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} className="flex flex-none items-center">
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — a number that settles when it scrolls into view           */
/* ------------------------------------------------------------------ */

export function CountUp({
  to,
  from = 0,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useCalmMotion();
  const [value, setValue] = useState(reduce ? to : from);

  useEffect(() => {
    // `reduce` only becomes true after mount, so jump to the final figure
    // rather than leaving the counter stranded at its starting value.
    if (reduce) {
      setValue(to);
      return;
    }
    if (!inView) return;
    const controls = animate(from, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, from, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-GB", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Ambient backdrops                                                   */
/* ------------------------------------------------------------------ */

/** Slow brass aurora over a dark surface. Diffuse, low opacity, never a fill. */
export function Aurora({ className }: { className?: string }) {
  const reduce = useCalmMotion();
  const blobs = [
    { c: "rgba(199,154,91,0.20)", s: "58vw", x: "4%", y: "-18%", d: 0 },
    { c: "rgba(138,106,61,0.22)", s: "46vw", x: "74%", y: "2%", d: -7 },
    { c: "rgba(199,154,91,0.10)", s: "54vw", x: "34%", y: "62%", d: -14 },
  ];
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blobs.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-[110px]"
          style={{
            width: b.s,
            height: b.s,
            left: b.x,
            top: b.y,
            background: `radial-gradient(circle, ${b.c}, transparent 68%)`,
          }}
          animate={
            reduce
              ? undefined
              : { x: [0, 40, -30, 0], y: [0, -34, 26, 0], scale: [1, 1.12, 0.94, 1] }
          }
          transition={{ duration: 26 + i * 6, repeat: Infinity, ease: "easeInOut", delay: b.d }}
        />
      ))}
    </div>
  );
}

/** Hairline grid, faded out by a radial mask. */
export function GridLines({
  className,
  size = 56,
  colour = "rgba(255,255,255,0.05)",
  mask = "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 78%)",
}: {
  className?: string;
  size?: number;
  colour?: string;
  mask?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `linear-gradient(${colour} 1px, transparent 1px), linear-gradient(90deg, ${colour} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

/** Film grain. Keeps big flat surfaces from looking like dead plastic. */
export function Grain({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 mix-blend-overlay"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* ScrollProgress — hairline reading indicator                          */
/* ------------------------------------------------------------------ */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-brass via-brass-soft to-brass-ink"
      style={{ scaleX }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* ShimmerBorder — a slow brass sweep around a card edge                */
/* ------------------------------------------------------------------ */

export function ShimmerBorder({
  children,
  className,
  radius = "1.5rem",
  duration = 7,
  width = 1.5,
}: {
  children: ReactNode;
  className?: string;
  radius?: string;
  duration?: number;
  width?: number;
}) {
  const reduce = useCalmMotion();
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ borderRadius: radius, padding: width }}
    >
      {/* a square conic gradient, larger than the box and clipped by it —
          only the sliver at the padded edge ever shows */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(199,154,91,0) 0deg, rgba(199,154,91,0.85) 35deg, rgba(199,154,91,0.05) 105deg, rgba(199,154,91,0) 190deg, rgba(199,154,91,0.5) 245deg, rgba(199,154,91,0) 320deg)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      />
      {/* a faint static rim so the edge never fully disappears */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/[0.06]"
      />
      <div className="relative" style={{ borderRadius: `calc(${radius} - ${width}px)` }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared bits                                                    */
/* ------------------------------------------------------------------ */

/** Section eyebrow: hairline + small caps label. */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em]",
        tone === "dark" ? "text-brass-on-dark" : "text-brass-ink",
        className
      )}
    >
      <span
        className={cn(
          "h-px w-7",
          tone === "dark" ? "bg-brass-on-dark/50" : "bg-brass-ink/40"
        )}
      />
      {children}
    </span>
  );
}

/** Draws an SVG path when it scrolls into view. */
export function DrawPath({
  d,
  className,
  duration = 1.6,
  delay = 0,
  strokeWidth = 2,
}: {
  d: string;
  className?: string;
  duration?: number;
  delay?: number;
  strokeWidth?: number;
}) {
  const reduce = useCalmMotion();
  return (
    <motion.path
      d={d}
      className={className}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
      whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: EASE_OUT }}
    />
  );
}
