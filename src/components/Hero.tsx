import { motion } from "framer-motion";
import { ArrowDown, Github, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MagneticButton } from "./MagneticButton";
import faresImg from "@/assets/fares.jpg";
import { DotPattern } from "./Patterns";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export function Hero() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const p = data.personal;
  const loc = lang === "ar" ? p.ar : p.en;
  const heroWords =
    lang === "ar"
      ? data.hero?.words_ar?.length
        ? data.hero.words_ar
        : ["مهندس.", "صانع.", "ثنائي اللغة."]
      : data.hero?.words_en?.length
        ? data.hero.words_en
        : ["Engineer.", "Builder.", "Bilingual."];

  return (
    <section id="top" className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      <DotPattern className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </DotPattern>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-20 -left-20 h-[500px] w-[500px] rounded-full bg-[oklch(0.85_0.1_240)] opacity-50 blur-3xl animate-blob hero-blob" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[oklch(0.78_0.12_270)] opacity-40 blur-3xl animate-blob hero-blob" style={{ animationDelay: "4s" }} />
        <div className="absolute top-1/3 left-1/2 h-[300px] w-[300px] rounded-full bg-[oklch(0.92_0.08_220)] opacity-50 blur-3xl animate-blob hero-blob" style={{ animationDelay: "8s" }} />
      </div>

      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-3 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm text-muted-foreground tracking-wide">
            {t("Available for new opportunities", "متاح لفرص جديدة")}
          </span>
        </motion.div>

        <h1 className="font-display text-[clamp(2.8rem,9vw,8.5rem)] leading-[0.92] tracking-[-0.04em]">
          {heroWords.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={`block ${i === 1 ? "italic font-normal text-[oklch(0.42_0.2_255)]" : ""}`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <div className="mt-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="max-w-md"
          >
            <p className="text-base text-muted-foreground leading-relaxed">
              {t("Hi — I'm ", "مرحباً — أنا ")}
              <span className="text-foreground font-medium">{p.name}</span>
              {t(", ", "، ")}
              {loc.bio}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" hash="contact" className="inline-block">
                <MagneticButton>
                  <Mail className="h-4 w-4" />
                  {t("Get in touch", "تواصل معي")}
                </MagneticButton>
              </Link>
              <MagneticButton href={`https://${p.github}`} variant="ghost">
                <Github className="h-4 w-4" />
                {t("GitHub", "جيت‌هاب")}
              </MagneticButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="relative"
          >
            <div
              data-cursor="view"
              data-cursor-label={p.name}
              className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden ring-1 ring-border soft-shadow animate-float-slow"
            >
              <img src={faresImg} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-foreground text-background text-xs px-3 py-1.5 rounded-full">
              {loc.location}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-20 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
          {t("Scroll to explore", "مرر للاستكشاف")}
        </motion.div>
      </div>
    </section>
  );
}
