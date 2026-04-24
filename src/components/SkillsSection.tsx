import { useEffect, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";
import { PhysicsPills, type PhysicsPillsHandle } from "./PhysicsPills";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export function SkillsSection() {
  const { data } = useSiteData();
  const { t } = useLang();
  const pillsRef = useRef<PhysicsPillsHandle>(null);

  const variantMap = [2, 1, 4, 3, 5, 6];
  const pills = (data.skills as Array<{ name: string }>).map((s, i) => ({
    label: s.name,
    variant: variantMap[i % variantMap.length],
  }));

  const [height, setHeight] = useState(720);
  useEffect(() => {
    const onResize = () => {
      // Smooth clamp instead of step breakpoints to avoid layout jumps.
      const w = window.innerWidth;
      const fluid = Math.round(Math.max(520, Math.min(760, w * 0.55 + 240)));
      setHeight(fluid);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <section
      id="skills"
      className="relative pt-20 sm:pt-24 pb-0 mb-0"
    >
      <div className="relative container mx-auto px-6 max-w-7xl">
        <Reveal>
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-center gap-3 mb-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                / 02 — {t("Toolkit", "الأدوات")}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 backdrop-blur px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-[oklch(0.55_0.2_255)]" />
                <span className="tabular-nums text-foreground font-medium">{data.skills.length}</span>
                {t("tech", "تقنية")}
              </span>
            </div>
            <h2 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.045em] max-w-4xl mx-auto leading-[0.92]">
              {t("Drag the things ", "اسحب الأشياء ")}
              <span className="italic gradient-text-primary relative">
                {t("I build with.", "التي أبني بها.")}
                <span className="absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
              </span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t(
                `${data.skills.length} technologies, frameworks and platforms — toss them around. Real physics, no walls.`,
                `${data.skills.length} تقنية وإطار ومنصة — حرّكها كما تريد. فيزياء حقيقية، بلا حواجز.`,
              )}
            </p>
          </div>
        </Reveal>
      </div>

      {/* Physics canvas — bare, no frame, blends with the section */}
      <div className="relative container mx-auto px-6 max-w-7xl mt-0">
        <Reveal delay={0.15}>
          <div className="relative">
            <button
              type="button"
              onClick={() => pillsRef.current?.replay()}
              className="absolute top-3 right-4 z-10 inline-flex items-center gap-2 rounded-full border border-current/15 bg-current/5 backdrop-blur px-3 py-1.5 text-xs opacity-70 hover:opacity-100 transition"
              aria-label={t("Replay", "إعادة")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("Replay", "إعادة")}
            </button>
            <div className="relative">
              <PhysicsPills ref={pillsRef} pills={pills} height={height} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
