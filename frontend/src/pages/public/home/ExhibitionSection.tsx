import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { MagneticCard } from "@/components/common/MagneticCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { exhibitionImage } from "@/data/media";

export function ExhibitionSection() {
  return (
    <section className="bg-muted py-24 lg:py-32">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:items-center">
        <AnimatedSection className="lg:col-span-7">
          <MagneticCard>
            <figure className="image-cut relative aspect-[16/10] overflow-hidden bg-mineral">
              <img
                src={exhibitionImage}
                alt="Previous-edition AIAIAC exhibition"
                width="832"
                height="520"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-mineral/58 via-transparent to-forest/18" />
              <figcaption className="absolute bottom-6 left-6 border-l-2 border-emerald pl-4 text-xs uppercase tracking-[0.12em] text-white">
                Previous edition exhibition
              </figcaption>
            </figure>
          </MagneticCard>
        </AnimatedSection>
        <div className="lg:col-span-4 lg:col-start-9">
          <SectionHeader
            eyebrow="Exhibition"
            title="Business opportunity, built around technical relevance"
            description="Showcase capability and connect with the professionals improving critical operations."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <ActionLink to="/exhibition">Explore exhibition</ActionLink>
            <ActionLink to="/sponsorship" variant="outline" className="text-mineral">
              Sponsorship
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
