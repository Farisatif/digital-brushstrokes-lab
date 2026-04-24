import { cn } from "@/lib/utils";

/**
 * Modern skeleton placeholder with a soft shimmer sweep.
 * Uses theme-aware tokens via color-mix in styles.css (.skeleton).
 * Always preserve final layout dimensions to avoid jank on reveal.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
