import { cn } from "@/lib/utils";
import { AuroraBackground } from "@/components/common/AuroraBackground";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function PageHero({
  eyebrow,
  title,
  description,
  status,
  variant = "default",
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  variant?: "default" | "editorial" | "compact";
}) {
  const compact = variant === "compact";
  const editorial = variant === "editorial";

  return (
    <section
      className={cn(
        "on-navy relative isolate overflow-hidden",
        compact ? "pb-14 pt-32 lg:pb-18 lg:pt-36" : "pb-20 pt-36 lg:pb-28 lg:pt-44",
      )}
    >
      <AuroraBackground />
      <div className="grid-lines absolute inset-0 -z-10 opacity-20" aria-hidden />
      <div
        className={cn(
          "shell relative grid gap-8 lg:grid-cols-12",
          editorial ? "lg:items-start" : "lg:items-end",
        )}
      >
        <AnimatedSection
          className={cn(editorial ? "lg:col-span-10" : compact ? "lg:col-span-7" : "lg:col-span-8")}
        >
          <p className="eyebrow text-emerald">{eyebrow}</p>
          <h1 className={cn("mt-7 max-w-5xl text-white", compact ? "display-lg" : "display-xl")}>
            {title}
          </h1>
        </AnimatedSection>
        <AnimatedSection
          delay={0.1}
          className={cn(
            editorial
              ? "border-t border-white/14 pt-7 lg:col-span-6 lg:col-start-7"
              : compact
                ? "lg:col-span-4 lg:col-start-9"
                : "lg:col-span-4",
          )}
        >
          {status && (
            <p className="mb-5 border-l-2 border-emerald pl-4 font-mono text-[0.64rem] uppercase leading-relaxed tracking-[0.18em] text-emerald">
              {status}
            </p>
          )}
          <p className="max-w-xl text-base leading-relaxed text-white/72">{description}</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
