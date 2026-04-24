import { useLang } from "./LanguageProvider";

export function Marquee({ items, itemsAr }: { items: string[]; itemsAr?: string[] }) {
  const { lang } = useLang();
  const list = lang === "ar" && itemsAr?.length ? itemsAr : items;
  const doubled = [...list, ...list];
  return (
    <div className="relative overflow-hidden py-8 border-y border-border bg-secondary/40">
      <div className={`flex gap-12 marquee whitespace-nowrap ${lang === "ar" ? "marquee-rtl" : ""}`}>
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-12">
            <span className="font-display text-3xl sm:text-5xl text-foreground/80">{item}</span>
            <span className="text-3xl sm:text-5xl text-[oklch(0.42_0.2_255)]">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
