import type { ReactNode } from "react";

/**
 * SectionBand — alternating colored bands that wrap each main section.
 *
 * Three variants cycle across the page: light, dark, primary.
 * In dark mode, light and dark swap automatically (the variant is the same,
 * but the underlying tokens flip), while primary stays as the brand accent.
 *
 * This gives the homepage a deliberate, magazine-style rhythm of contrasting
 * sections while keeping the design system cohesive.
 */
export type BandVariant = "light" | "dark" | "primary";

interface Props {
  variant: BandVariant;
  children: ReactNode;
  className?: string;
  id?: string;
}

const variantClasses: Record<BandVariant, string> = {
  // "light" = pure background in light mode, pure foreground inverted bg in dark.
  light: "bg-band-light text-band-light-foreground",
  // "dark" = inverted of light: dark in light mode, light in dark mode.
  dark: "bg-band-dark text-band-dark-foreground",
  // "primary" = the brand color, identical across themes (slightly tuned).
  primary: "bg-band-primary text-band-primary-foreground",
};

export function SectionBand({ variant, children, className = "", id }: Props) {
  return (
    <div
      id={id}
      data-band={variant}
      className={`relative ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
