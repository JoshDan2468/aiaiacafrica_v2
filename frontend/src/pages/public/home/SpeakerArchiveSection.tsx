import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { SpeakerLoop } from "@/components/speakers/SpeakerLoop";
import { allSpeakers, featuredSpeakers } from "@/data/speakers";

export function SpeakerArchiveSection() {
  return (
    <section
      id="speakers"
      aria-labelledby="featured-speakers-title"
      className="on-navy people-section-bg relative overflow-hidden py-20 lg:py-28"
    >
      <div className="shell">
        <AnimatedSection className="flex flex-col justify-between gap-5 border-l-2 border-lime pl-5 sm:pl-7 lg:flex-row lg:items-end">
          <div>
            <h2
              id="featured-speakers-title"
              className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Featured Speakers
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Explore the speaker lineup across asset integrity, artificial intelligence, process
            automation and cybersecurity.
          </p>
        </AnimatedSection>
      </div>

      {/* Single Continuous Seamless Speaker Rail */}
      <div className="mt-12">
        <SpeakerLoop
          speakers={featuredSpeakers}
          direction="left"
          label="Featured speakers continuous rail"
        />
      </div>

      <div className="shell mt-10">
        <ActionLink to="/speakers" variant="outline" className="text-white">
          View All Speakers
        </ActionLink>
      </div>
    </section>
  );
}
