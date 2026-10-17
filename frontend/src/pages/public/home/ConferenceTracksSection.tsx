import { ArrowUpRight } from "lucide-react";
import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { pillars } from "@/data/media";

export function ConferenceTracksSection() {
  return (
    <section
      id="programme"
      aria-labelledby="conference-tracks-title"
      className="relative overflow-hidden bg-bone py-16 sm:py-20 lg:py-24"
    >
      {/* Subtle animated background gradient field */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-forest/5 via-transparent to-lime/10 opacity-80 animate-pulse motion-reduce:animate-none"
        aria-hidden
      />

      <div className="shell relative z-10">
        <AnimatedSection className="grid gap-4 border-l-2 border-forest pl-4 sm:pl-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.42fr)] lg:items-end">
          <div>
            <h2
              id="conference-tracks-title"
              className="font-display text-3xl font-extrabold tracking-tight text-mineral sm:text-4xl lg:text-5xl"
            >
              Four Specialised Conferences
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-mineral/75 sm:text-base">
            Four connected disciplines for safer, smarter and more resilient operations.
          </p>
        </AnimatedSection>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 lg:gap-6">
          {pillars.map((pillar, index) => (
            <AnimatedSection key={pillar.title} delay={index * 0.06}>
              <article className="group relative isolate min-h-[20rem] overflow-hidden rounded-2xl bg-mineral text-white sm:min-h-[22rem] lg:min-h-[24rem]">
                <img
                  src={pillar.image}
                  alt={`${pillar.title} conference focus`}
                  width={960}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-within:scale-[1.04]"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#031007] via-[#031007]/50 to-[#031007]/15"
                  aria-hidden
                />
                <div className="relative flex h-full min-h-[20rem] flex-col justify-end p-6 sm:min-h-[22rem] sm:p-7 lg:min-h-[24rem] lg:p-8">
                  <h3 className="max-w-xl font-display text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                    {pillar.title}
                  </h3>
                  <div className="mt-3 border-l border-lime/70 pl-3.5 sm:pl-4">
                    <p className="text-xs sm:text-sm leading-relaxed text-white/85">
                      {pillar.description}
                    </p>
                  </div>
                  <span
                    className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lime transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 sm:right-7 sm:top-7"
                    aria-hidden
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </article>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.16} className="mt-8 lg:mt-10">
          <ActionLink to="/registration" variant="solidNavy">
            Submit an Abstract
          </ActionLink>
        </AnimatedSection>
      </div>
    </section>
  );
}
