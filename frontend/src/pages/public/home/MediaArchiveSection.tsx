import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { MagneticCard } from "@/components/common/MagneticCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { mediaItems } from "@/data/media";

export function MediaArchiveSection() {
  const [leadMedia, ...supportingMedia] = mediaItems;

  if (!leadMedia) return null;

  return (
    <section className="bg-muted py-24 lg:py-32">
      <div className="shell">
        <SectionHeader
          eyebrow="Media archive"
          title="Inside the exchange"
          description="A concise view of previous-edition technical sessions, technology discovery and industry connection."
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          <AnimatedSection className="lg:col-span-8">
            <MagneticCard>
              <figure className="image-cut relative aspect-[16/9] overflow-hidden bg-mineral">
                <img
                  src={leadMedia.src}
                  alt={leadMedia.caption}
                  width={leadMedia.width}
                  height={leadMedia.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mineral/80 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-6 text-sm text-white/72">
                  {leadMedia.caption} · previous edition
                </figcaption>
              </figure>
            </MagneticCard>
          </AnimatedSection>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            {supportingMedia.slice(0, 2).map((item, index) => (
              <AnimatedSection key={item.id} delay={0.08 + index * 0.06}>
                <MagneticCard>
                  <figure className="relative aspect-[16/8] overflow-hidden bg-mineral">
                    <img
                      src={item.src}
                      alt={item.caption}
                      width={item.width}
                      height={item.height}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-88"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-mineral/82 to-transparent" />
                  </figure>
                </MagneticCard>
              </AnimatedSection>
            ))}
          </div>
        </div>
        <AnimatedSection className="mt-10">
          <ActionLink to="/media" variant="outline" className="text-mineral">
            View media archive
          </ActionLink>
        </AnimatedSection>
      </div>
    </section>
  );
}
