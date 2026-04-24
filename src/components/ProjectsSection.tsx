import { Reveal } from "./Reveal";
import { ArrowUpRight, GitFork, Star } from "lucide-react";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { ChevronPattern } from "./Patterns";

export function ProjectsSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  return (
    <section id="projects" className="py-24 sm:py-32">
      <ChevronPattern>
        <div className="container mx-auto px-6 max-w-7xl">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
              / 04 — {t("Selected work", "أعمال مختارة")}
            </p>
            <h2 className="font-display text-5xl sm:text-7xl tracking-[-0.04em] leading-[0.95] max-w-4xl">
              {t("Projects ", "مشاريع ")}
              <span className="italic text-[oklch(0.42_0.2_255)]">
                {t("in the wild.", "على أرض الواقع.")}
              </span>
            </h2>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-2 gap-6">
            {data.projects.map((p, i) => {
              const tags = lang === "ar" ? p.tags_ar : p.tags_en;
              const desc = lang === "ar" ? p.ar.description : p.en.description;
              return (
                <Reveal key={p.name} delay={i * 0.08}>
                  <a
                    href={`https://${p.url}`}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="view"
                    data-cursor-label={t("Open", "افتح")}
                    className="group block relative rounded-3xl border border-border bg-card p-8 sm:p-10 h-full overflow-hidden transition-all hover:border-foreground/30 hover-lift"
                  >
                    <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-[oklch(0.85_0.1_240)] opacity-0 group-hover:opacity-60 blur-3xl transition-opacity duration-700" />
                    <div className="absolute top-6 right-6 h-10 w-10 rounded-full bg-secondary flex items-center justify-center transition-transform group-hover:rotate-45 group-hover:bg-foreground group-hover:text-background">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {tags.map((tg) => (
                        <span
                          key={tg}
                          className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tg}
                        </span>
                      ))}
                    </div>

                    <h3 className="font-display text-3xl sm:text-4xl tracking-tight">{p.name}</h3>
                    <p className="mt-4 text-base text-muted-foreground leading-relaxed">{desc}</p>

                    <div className="mt-8 flex items-center gap-5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.55_0.22_255)]" />
                        {p.language}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5" /> {p.stars}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <GitFork className="h-3.5 w-3.5" /> {p.forks}
                      </span>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </ChevronPattern>
    </section>
  );
}
