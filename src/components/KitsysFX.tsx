import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Kitsys-inspired scroll FX layer.
 * Renders a fixed full-viewport canvas of subtle, scroll-reactive background
 * elements: a soft gradient orb, a translating dotted grid and a faint
 * diagonal arrow strip. The whole layer sits behind page content via z-index.
 */
export function KitsysScrollBackdrop() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const orbY = useTransform(scrollYProgress, [0, 1], ["-10%", "30%"]);
  const orbX = useTransform(scrollYProgress, [0, 1], ["-5%", "8%"]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const arrowsY = useTransform(scrollYProgress, [0, 1], ["10%", "-15%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 12]);

  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* soft accent orb */}
      <motion.div
        style={{ y: orbY, x: orbX, scale: orbScale }}
        className="absolute top-[10%] left-[5%] h-[55vw] w-[55vw] max-w-[720px] max-h-[720px] rounded-full opacity-40 dark:opacity-50 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--primary),transparent_60%)]" />
      </motion.div>

      {/* drifting dotted grid */}
      <motion.div
        style={{ y: gridY }}
        className="absolute inset-x-0 top-0 h-[200vh] opacity-[0.18] dark:opacity-[0.22]"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--primary) 1px, transparent 1.4px)",
            backgroundSize: "30px 30px",
            maskImage:
              "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* diagonal arrow strip */}
      <motion.div
        style={{ y: arrowsY, rotate }}
        className="absolute -right-20 top-[30%] h-[40vh] w-[120%] opacity-[0.07] dark:opacity-[0.12]"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'><g fill='none' stroke='%231D4ED8' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='10,10 30,20 10,30'/><polyline points='40,10 60,20 40,30'/></g></svg>\")",
            backgroundSize: "80px 40px",
          }}
        />
      </motion.div>
    </div>
  );
}

/**
 * Per-section scroll reveal: subtle parallax + opacity, useful as an "FX layer"
 * wrapper behind a section's content.
 */
export function KitsysParallax({
  children,
  speed = 0.15,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}