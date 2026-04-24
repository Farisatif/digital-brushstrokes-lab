import { Reveal } from "./Reveal";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export function AboutSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const stats = data.personal.stats;
  const loc = lang === "ar" ? data.personal.ar : data.personal.en;
  const items = [
    { label: t("Commits", "المساهمات"), value: stats.commits },
    { label: t("Repositories", "المستودعات"), value: stats.repos },
    { label: t("Stars earned", "النجوم"), value: stats.stars },
    { label: t("Coding since", "البرمجة منذ"), value: stats.since },
  ];

  return (
    <section id="about" className="py-24 sm:py-32 relative">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-12">
          <Reveal className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
              / 01 — {t("About", "نبذة")}
            </p>
            <h2 className="font-display text-5xl sm:text-7xl tracking-[-0.04em] leading-[0.95]">
              {t("Crafting software ", "أصنع برمجيات ")}
              <span className="italic gradient-text-primary">
                {t("that ships.", "تصل للمستخدم.")}
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-7 lg:pt-4">
            <p className="text-xl sm:text-2xl leading-relaxed text-foreground/80 font-light">
              {loc.bio}
            </p>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              {t(
                "I started coding in 2019 — middle school. Today I build full-stack web apps, mobile experiences, and systems-level tools. I care about details: spacing, motion, edge cases, and the small joys that make software feel alive.",
                "بدأت البرمجة في ٢٠١٩ في المرحلة الإعدادية. اليوم أبني تطبيقات ويب متكاملة وتجارب جوال وأدوات أنظمة. أهتم بالتفاصيل: التباعد، الحركة، الحالات الحدية، والتفاصيل الصغيرة التي تمنح البرمجيات حياة.",
              )}
            </p>
          </Reveal>
        </div>

        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-3xl overflow-hidden soft-shadow">
          {items.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.1} className="group bg-card p-8 sm:p-10 transition-colors hover:bg-secondary/40 relative overflow-hidden">
              <div className="font-display text-4xl sm:text-6xl tracking-tight transition-transform group-hover:-translate-y-0.5">{item.value}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-3">
                {item.label}
              </div>
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[oklch(0.92_0.05_240)] opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
