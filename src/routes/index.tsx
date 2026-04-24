import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { AboutSection } from "@/components/AboutSection";
import { SkillsSection } from "@/components/SkillsSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProjectsSection } from "@/components/ProjectsSection";
import { AchievementsSection } from "@/components/AchievementsSection";
import { ContactSection } from "@/components/ContactSection";
import { GithubActivitySection } from "@/components/GithubActivitySection";
import { SectionBand } from "@/components/SectionBand";
import { useSiteData } from "@/components/SiteDataProvider";
import { useLang } from "@/components/LanguageProvider";
import { ScrollProgress } from "@/components/motion-primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fares Ahmed — Software Engineer & Builder" },
      {
        name: "description",
        content:
          "Fares Ahmed is a bilingual full-stack engineer from Sana'a, Yemen — building scalable systems, mobile experiences, and elegant UIs.",
      },
      { property: "og:title", content: "Fares Ahmed — Software Engineer" },
      {
        property: "og:description",
        content:
          "Full-stack engineer building scalable systems and elegant user experiences across web, mobile, and systems.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useSiteData();
  const { lang } = useLang();
  const tagsEn = data.personal.en.taglines;
  const tagsAr = data.personal.ar.taglines;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Navbar />
      {/* Hero keeps default background to anchor the page */}
      <Hero />
      <Marquee items={tagsEn} itemsAr={tagsAr} key={lang} />

      {/* Curated rhythm — alternating bands for a clear, magazine-style flow.
          Light/dark tokens auto-invert between themes, so the same layout
          feels right in both modes. */}
      <SectionBand variant="light" pattern="grid-fine" divider>
        <AboutSection />
      </SectionBand>

      <SectionBand variant="dark" pattern="none" divider>
        <SkillsSection />
      </SectionBand>

      <SectionBand variant="light" pattern="grid-fine" divider>
        <ExperienceSection />
      </SectionBand>

      <SectionBand variant="primary" pattern="grid" divider>
        <ProjectsSection />
      </SectionBand>

      <SectionBand variant="light" pattern="grid-fine" divider>
        <AchievementsSection />
      </SectionBand>

      <SectionBand variant="dark" pattern="none" divider>
        <GithubActivitySection />
      </SectionBand>

      <SectionBand variant="dark" pattern="grid-fine" divider>
        <ContactSection />
      </SectionBand>
    </div>
  );
}
