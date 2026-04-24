import { useEffect } from "react";

/**
 * Adds a `booting` class to <html> on first mount and removes it after the
 * first-load cascade completes. CSS in styles.css drives the rise + fade.
 * Skipped when the user prefers reduced motion.
 */
export function PageBoot() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const root = document.documentElement;
    root.classList.add("booting");
    const t = window.setTimeout(() => {
      root.classList.remove("booting");
    }, 1400);
    return () => {
      window.clearTimeout(t);
      root.classList.remove("booting");
    };
  }, []);
  return null;
}