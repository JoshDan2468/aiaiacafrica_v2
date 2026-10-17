import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { MagneticCard } from "@/components/common/MagneticCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { pillars } from "@/data/media";

export function ConferenceFocusSection() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="shell">
        <SectionHeader
          eyebrow="Conference focus"
          title="A framework ready for the 2027 programme"
          description="Exact tracks and activities are being confirmed; the enduring focus remains the intersection of integrity, intelligence, automation and cybersecurity."
        />
        <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => (
            <AnimatedSection key={pillar.index} delay={index * 0.055}>
              <MagneticCard className="h-full">
                <article className="flex h-full min-h-72 flex-col bg-background p-7 transition-colors duration-500 hover:bg-muted">
                  <span className="numeral text-sm text-emerald-deep">{pillar.index}</span>
                  <h3 className="display-md mt-auto pt-16 text-mineral">{pillar.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                </article>
              </MagneticCard>
            </AnimatedSection>
          ))}
        </div>
        <AnimatedSection className="mt-10">
          <ActionLink to="/conferences" variant="outline" className="text-mineral">
            Explore conferences
          </ActionLink>
        </AnimatedSection>
      </div>
    </section>
  );
}
