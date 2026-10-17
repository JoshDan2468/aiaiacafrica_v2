import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { AuroraBackground } from "@/components/common/AuroraBackground";

export function CTASection({
  eyebrow = "Take your place",
  title,
  description,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}) {
  return (
    <section className="on-navy relative isolate overflow-hidden py-20 lg:py-28">
      <AuroraBackground className="opacity-60" />
      <div className="grid-lines absolute inset-0 -z-10 opacity-25" aria-hidden />
      <div className="shell relative grid gap-10 lg:grid-cols-12 lg:items-end">
        <AnimatedSection className="lg:col-span-8">
          <p className="eyebrow text-emerald">{eyebrow}</p>
          <h2 className="display-lg mt-6 max-w-4xl text-white">{title}</h2>
          {description && <p className="mt-6 max-w-2xl text-white/68">{description}</p>}
        </AnimatedSection>
        <AnimatedSection delay={0.12} className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <ActionLink to={primaryTo} size="lg">
            {primaryLabel}
          </ActionLink>
          {secondaryLabel && secondaryTo && (
            <ActionLink to={secondaryTo} size="lg" variant="outline" className="text-white">
              {secondaryLabel}
            </ActionLink>
          )}
        </AnimatedSection>
      </div>
    </section>
  );
}
