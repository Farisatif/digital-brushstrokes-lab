import { Reveal } from "./Reveal";
import { MagneticButton } from "./MagneticButton";
import { Mail, MessageCircle, Github, Linkedin, MapPin } from "lucide-react";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { SettingsDrawer } from "@/components/cms/SettingsDrawer";
import { ChevronPattern } from "./Patterns";

export function ContactSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const p = data.personal;
  const loc = lang === "ar" ? p.ar : p.en;
  return (
    <section id="contact" className="py-24 sm:py-40 bg-foreground text-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <ChevronPattern className="absolute inset-0">
          <div className="h-full w-full" />
        </ChevronPattern>
      </div>
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[oklch(0.55_0.22_255)] opacity-40 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[oklch(0.78_0.12_270)] opacity-30 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />

      <div className="container mx-auto px-6 max-w-5xl relative text-center">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-background/50 mb-6">
            / 06 — {t("Let's talk", "لنتحدث")}
          </p>
          <h2 className="font-display text-6xl sm:text-8xl lg:text-9xl tracking-[-0.04em] leading-[0.9]">
            {t("Got an idea?", "لديك فكرة؟")}
            <br />
            <span className="italic text-[oklch(0.78_0.15_240)]">
              {t("Let's build it.", "لنبنها معاً.")}
            </span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-10 text-lg text-background/70 max-w-xl mx-auto">
            {t(
              "Open to freelance projects, collaborations, and full-time roles. I usually reply within a day.",
              "متاح لمشاريع العمل الحر والتعاون والوظائف بدوام كامل. عادةً ما أرد خلال يوم.",
            )}
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12 flex flex-wrap justify-center gap-3 relative z-10">
            <MagneticButton href={`mailto:${p.email}`} className="!bg-background !text-foreground">
              <Mail className="h-4 w-4" /> {p.email}
            </MagneticButton>
            <MagneticButton
              href={`https://wa.me/${p.whatsapp}`}
              variant="ghost"
              className="!bg-transparent !border-background/30 !text-background hover:!bg-background/10"
            >
              <MessageCircle className="h-4 w-4" /> {t("WhatsApp", "واتساب")}
            </MagneticButton>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-background/60">
            <a href={`https://${p.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-background transition-colors">
              <Github className="h-4 w-4" /> {p.github}
            </a>
            <a href={`https://${p.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-background transition-colors">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {loc.location}
            </span>
          </div>
        </Reveal>
      </div>

      <div className="container mx-auto px-6 max-w-7xl mt-32 relative">
        <div className="flex flex-wrap gap-4 justify-between items-center text-xs text-background/40 border-t border-background/10 pt-8">
          <span>© {new Date().getFullYear()} {p.name}</span>
          <SettingsDrawer />
          <span>{t("Built with care · Sana'a, YE", "صُنع بعناية · صنعاء، اليمن")}</span>
        </div>
      </div>
    </section>
  );
}
