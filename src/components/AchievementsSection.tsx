import { Reveal } from "./Reveal";
import {
  Award,
  Code2,
  CheckCircle2,
  Users,
  Briefcase,
  Layers,
  Clock,
  Star,
  Zap,
  Sparkles,
  Rocket,
  Trophy,
} from "lucide-react";
import { DotPattern } from "./Patterns";
import { GlowDots } from "./GlowDots";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export const ACHIEVEMENT_ICONS: Record<string, typeof Award> = {
  code: Code2,
  check: CheckCircle2,
  users: Users,
  briefcase: Briefcase,
  layers: Layers,
  clock: Clock,
  award: Award,
  star: Star,
  zap: Zap,
  sparkles: Sparkles,
  rocket: Rocket,
  trophy: Trophy,
};

export function AchievementsSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  return (
    <section className="py-24 sm:py-32 bg-secondary/40">
      <DotPattern>
        <div className="container mx-auto px-6 max-w-7xl">
          <Reveal>
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 -z-0 flex items-center justify-center">
                <div
                  className="relative w-full max-w-[640px] aspect-square rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)]"
                  style={{ background: "#0a0a0a" }}
                >
                  {/* KitSys-style faint chevrons */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='14,22 22,30 14,38' transform='rotate(15 18 30)'/><polyline points='38,22 46,30 38,38' transform='rotate(-25 42 30)'/></g></svg>\")",
                      backgroundSize: "60px 60px",
                    }}
                  />
                  <GlowDots asBackground height="100%" spacing={30} dotColor="#ffffff" glowColor="#93c5fd" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
                </div>
              </div>
              <div className="relative z-10 px-6 py-16 sm:py-24 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-4">
                  / 05 — {t("Milestones", "إنجازات")}
                </p>
                <h2 className="font-display text-5xl sm:text-7xl tracking-[-0.04em] leading-[0.95] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]">
                  {t("A few ", "بعض ")}
                  <span className="italic text-[#93c5fd]">
                    {t("proud moments.", "اللحظات المُشرّفة.")}
                  </span>
                </h2>
              </div>
            </div>
          </Reveal>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.achievements.map((a, i) => {
              const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Award;
              const title = lang === "ar" ? a.title_ar : a.title_en;
              const desc = lang === "ar" ? a.desc_ar : a.desc_en;
              const badge = lang === "ar" ? a.badge_ar : a.badge_en;
              return (
                <Reveal key={a.id} delay={i * 0.06}>
                  <div
                    data-cursor="view"
                    data-cursor-label={t("View", "عرض")}
                    className="group relative h-full rounded-3xl bg-card border border-border p-7 overflow-hidden transition-all hover-lift hover:border-foreground/20"
                  >
                    <div
                      className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-0 group-hover:opacity-80 blur-3xl transition-opacity duration-700"
                      style={{ background: `hsl(${a.accent} / 0.45)` }}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-6">
                        <div
                          className="h-12 w-12 rounded-2xl text-background flex items-center justify-center transition-colors"
                          style={{ background: `hsl(${a.accent})` }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {badge}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </DotPattern>
    </section>
  );
}
