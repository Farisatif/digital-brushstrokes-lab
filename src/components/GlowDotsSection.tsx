import { Reveal } from "./Reveal";
import { GlowDots } from "./GlowDots";

export function GlowDotsSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <Reveal>
          <div className="mb-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
              / Interactive
            </p>
            <h2 className="font-display text-4xl sm:text-6xl tracking-[-0.04em] leading-[0.95]">
              Touch the panel — <span className="italic text-[oklch(0.42_0.2_255)]">dots come alive.</span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              حرّك الإصبع أو الماوس فوق اللوحة الزرقاء، النقاط القريبة تتوهج وتنتشر ثم تختفي بسلاسة.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <GlowDots height={520} className="soft-shadow" />
        </Reveal>
      </div>
    </section>
  );
}
