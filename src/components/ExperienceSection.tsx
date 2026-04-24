import { Reveal } from "./Reveal";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export function ExperienceSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  return (
    <section id="work" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--primary) 60%, transparent)" }} />
      <div className="container mx-auto px-6 max-w-7xl relative">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] opacity-55 mb-4">
            / 03 — {t("Experience", "الخبرة")}
          </p>
          <h2 className="font-display text-5xl sm:text-7xl tracking-[-0.04em] leading-[0.95] max-w-4xl">
            {t("Where I've ", "أين قضيت ")}
            <span className="italic" style={{ color: "color-mix(in oklab, var(--primary) 70%, currentColor)" }}>
              {t("put in the hours.", "ساعات العمل.")}
            </span>
          </h2>
        </Reveal>

        <div className="mt-20 space-y-px">
          {data.experience.map((exp, i) => {
            const l = lang === "ar" ? exp.ar : exp.en;
            return (
              <Reveal key={exp.company} delay={i * 0.1}>
                <div className="group grid grid-cols-12 gap-4 py-10 border-t transition-colors -mx-4 px-4 rounded-xl"
                  style={{
                    borderColor: "color-mix(in oklab, currentColor 15%, transparent)",
                  }}>
                  <div className="col-span-12 sm:col-span-2 text-sm opacity-60 tabular-nums">
                    {exp.period}
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <div className="font-display text-3xl sm:text-4xl">{exp.company}</div>
                    <div className="text-sm opacity-60 mt-1">{l.location}</div>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <div className="text-lg font-medium">{l.role}</div>
                    <p className="mt-2 text-base opacity-75 leading-relaxed">{l.description}</p>
                    <ul className="mt-4 space-y-2">
                      {l.highlights.map((h) => (
                        <li key={h} className="text-sm opacity-65 flex gap-3">
                          <span className="mt-1.5" style={{ color: "color-mix(in oklab, var(--primary) 80%, currentColor)" }}>▸</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
