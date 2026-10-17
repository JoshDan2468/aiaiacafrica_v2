import { AnimatedSection } from "@/components/common/AnimatedSection";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}) {
  return (
    <AnimatedSection
      className={cn(align === "center" && "mx-auto max-w-4xl text-center", className)}
    >
      {eyebrow ? (
        <p className={cn("eyebrow", light ? "text-emerald" : "text-emerald-deep")}>{eyebrow}</p>
      ) : null}
      <h2 className={cn("display-lg mt-4", light ? "text-white" : "text-mineral")}>{title}</h2>
      {description && (
        <p
          className={cn(
            "mt-6 max-w-2xl text-base leading-relaxed",
            align === "center" && "mx-auto",
            light ? "text-white/68" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </AnimatedSection>
  );
}
