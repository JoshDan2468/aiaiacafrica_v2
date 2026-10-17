import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { conferenceExperience } from "@/data/brochure";
import { conference } from "@/data/conference";
import { mediaItems } from "@/data/media";

const overviewCopy = conference.overview;
const overviewImage = mediaItems[0];

export function EventOverviewSection() {
  if (!overviewImage) return null;

  return (
    <section
      id="about"
      aria-labelledby="event-overview-title"
      className="bg-background py-20 sm:py-24 lg:py-32"
    >
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-18 xl:gap-24">
          <AnimatedSection className="editorial-panel bg-[#f3f1e9] p-6 sm:p-9 lg:py-10 xl:p-12">
            <h2
              id="event-overview-title"
              className="font-display text-4xl font-extrabold tracking-tight text-mineral sm:text-5xl lg:text-6xl"
            >
              Event Overview
            </h2>
            <div className="mt-9 space-y-5 border-l border-forest/45 pl-5 text-sm leading-7 text-mineral/72 sm:pl-7 sm:text-base sm:leading-7">
              {overviewCopy.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <ol className="mt-9 grid gap-x-6 border-t border-mineral/14 pt-5 sm:grid-cols-2">
              {conferenceExperience.map((experience, index) => (
                <li
                  key={experience}
                  className="flex gap-3 border-b border-mineral/10 py-3 text-xs font-semibold leading-snug text-mineral/78"
                >
                  <span className="font-mono text-[0.55rem] tracking-[0.12em] text-forest">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {experience}
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <ActionLink to="/registration" variant="outline" className="text-mineral">
                Visitor information
              </ActionLink>
            </div>
          </AnimatedSection>

          <AnimatedSection
            delay={0.12}
            className="relative min-h-[28rem] overflow-hidden bg-mineral sm:min-h-[38rem] lg:min-h-full"
          >
            <img
              src={overviewImage.src}
              alt={overviewImage.caption}
              width={overviewImage.width}
              height={overviewImage.height}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#031007]/82 via-transparent to-[#031007]/18"
              aria-hidden
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
