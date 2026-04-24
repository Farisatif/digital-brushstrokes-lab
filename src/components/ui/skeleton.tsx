import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLElement> & {
  /** Render as <span> when used inline inside text/number elements. */
  as?: "div" | "span";
};

/**
 * Modern skeleton placeholder with a soft shimmer sweep.
 * Uses theme-aware tokens via color-mix in styles.css (.skeleton).
 * Always preserve final layout dimensions to avoid jank on reveal.
 */
function Skeleton({ className, as = "div", ...props }: SkeletonProps) {
  const Tag = as as keyof React.JSX.IntrinsicElements;
  return (
    <Tag
      className={cn("skeleton rounded-md", className)}
      aria-hidden="true"
      {...(props as Record<string, unknown>)}
    />
  );
}

export { Skeleton };
