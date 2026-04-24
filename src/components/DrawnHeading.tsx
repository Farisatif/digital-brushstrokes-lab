import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * A heading where each letter is drawn as a stroked SVG path that fills as the
 * user scrolls — Kitsys-style scroll-drawn font.
 */
export function DrawnHeading({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "start 0.2"] });
  const fillOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const dash = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <svg
        viewBox="0 0 1000 160"
        preserveAspectRatio="xMinYMid meet"
        className="w-full h-auto"
        aria-label={text}
      >
        <defs>
          <linearGradient id="drawn-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.22 255)" />
            <stop offset="100%" stopColor="oklch(0.42 0.2 255)" />
          </linearGradient>
        </defs>
        <motion.text
          x="0"
          y="120"
          fontFamily="Bricolage Grotesque, Inter, sans-serif"
          fontWeight={700}
          fontSize={140}
          letterSpacing={-6}
          fill="url(#drawn-grad)"
          stroke="url(#drawn-grad)"
          strokeWidth={1.4}
          style={{
            fillOpacity,
            pathLength: 1,
            strokeDasharray: 1,
            strokeDashoffset: dash,
          }}
        >
          {text}
        </motion.text>
      </svg>
    </div>
  );
}