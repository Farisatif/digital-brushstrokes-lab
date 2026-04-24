import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Kitsys-inspired growing circle: a large blue disc that scales as the user scrolls
 * past the section, sitting behind the content.
 */
export function GrowingCircleSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1.6, 2.6]);
  const y = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 0.95, 0.95, 0]);

  return (
    <div ref={ref} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          style={{ scale, y, opacity }}
          className="h-[80vw] w-[80vw] max-h-[760px] max-w-[760px] rounded-full bg-[oklch(0.42_0.2_255)] dark:bg-[oklch(0.55_0.22_255)]"
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}