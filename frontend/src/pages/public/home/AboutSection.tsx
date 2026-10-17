import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { CinematicMedia } from "@/components/common/CinematicMedia";
import { SectionHeader } from "@/components/common/SectionHeader";
import { homeVideoMedia } from "@/data/media";

export function AboutSection() {
  return (
    <section className="bg-muted py-20 lg:py-28">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-12">
          <SectionHeader
            eyebrow="About AIAIAC"
            title="Four disciplines. One operational reality."
            description="AIAIAC connects physical asset integrity with intelligent systems, automation and cyber resilience for the people responsible for critical operations."
            className="lg:col-span-7"
          />
          <AnimatedSection delay={0.12} className="flex items-end lg:col-span-4 lg:col-start-9">
            <ActionLink to="/about" variant="outline" size="lg" className="text-mineral">
              Explore AIAIAC
            </ActionLink>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.16} className="mx-auto mt-14 max-w-6xl lg:mt-18">
          <figure className="image-cut relative aspect-video overflow-hidden bg-mineral shadow-[0_2rem_5rem_oklch(0.195_0.035_158/.18)]">
            <CinematicMedia
              source={homeVideoMedia.about.videoSrc}
              poster={homeVideoMedia.about.posterSrc}
              posterAlt={homeVideoMedia.about.posterAlt}
              width={homeVideoMedia.about.width}
              height={homeVideoMedia.about.height}
              objectPosition={homeVideoMedia.about.objectPosition}
              className="absolute inset-0"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-mineral/78 via-mineral/8 to-forest/18"
              aria-hidden
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 text-white sm:p-7">
              <div className="border-l-2 border-emerald pl-4">
                <p className="eyebrow text-emerald">Event film</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/72">
                  Previous-edition moments
                </p>
              </div>
              <span className="hidden font-mono text-[0.56rem] uppercase tracking-[0.16em] text-white/52 sm:block">
                AIAIAC Africa
              </span>
            </figcaption>
          </figure>
        </AnimatedSection>
      </div>
    </section>
  );
}
