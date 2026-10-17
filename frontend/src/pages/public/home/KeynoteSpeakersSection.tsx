import { AnimatedSection } from "@/components/common/AnimatedSection";
import { previousEdition } from "@/data/event";
import { keynotes } from "@/data/speakers";

const trackLabels: Record<string, string> = {
  "asset-integrity": "Asset Integrity",
  "automation-cybersecurity": "Automation & Cybersecurity",
};

export function KeynoteSpeakersSection() {
  return (
    <section
      aria-labelledby="keynote-speakers-title"
      className="relative isolate overflow-hidden bg-[#05190f] py-20 pt-0 text-white sm:py-24 lg:py-28"
    >
      <div className="grid-lines absolute inset-0 -z-20 opacity-[0.12]" aria-hidden />
      <div
        className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(circle_at_75%_45%,oklch(0.455_0.135_148/.2),transparent_60%)]"
        aria-hidden
      />

      <div className="shell">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(15rem,1fr)] xl:items-center xl:gap-10 2xl:gap-14">
          <AnimatedSection
            delay={0.28}
            className="order-first flex items-end justify-between gap-6 border-b border-white/15 pb-6 xl:order-last xl:min-h-124 xl:flex-col xl:items-stretch xl:justify-center xl:border-b-0 xl:border-l xl:pb-0 xl:pl-9"
          >
            <div>
              <p className="eyebrow text-lime">Featured voices</p>
              <h2
                id="keynote-speakers-title"
                className="mt-5 text-[clamp(2.7rem,8vw,5.1rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.055em] text-bone xl:text-[clamp(3.2rem,4.1vw,5.25rem)]"
              >
                <span className="block text-lime">Keynote</span>
                <span className="block">Speakers</span>
              </h2>
            </div>
            <p className="hidden max-w-48 text-right text-[0.62rem] font-semibold uppercase leading-relaxed tracking-[0.16em] text-white/48 sm:block xl:text-left">
              Leadership from the previous AIAIAC edition
            </p>
          </AnimatedSection>

          <div className="relative min-w-0 pt-8 sm:pt-12 xl:pt-16">
            <AnimatedSection className="absolute inset-x-0 bottom-7 top-36 overflow-hidden bg-[#173d2d] sm:bottom-9 sm:top-44 lg:top-52">
              <div aria-hidden className="absolute inset-0">
                <div className="absolute inset-y-0 left-0 w-[37%] bg-[#264d3d]" />
                <div className="absolute inset-y-0 right-0 w-[31%] bg-[#395344]" />
                <div className="grid-lines absolute inset-0 opacity-35" />
                <div className="absolute left-[37%] top-0 h-full w-px bg-lime/35" />
                <div className="absolute right-[31%] top-0 h-full w-px bg-white/12" />
                <div className="absolute left-[45%] top-[18%] h-16 w-16 rotate-45 border-r-[0.85rem] border-t-[0.85rem] border-lime/65 sm:h-20 sm:w-20" />
                <div className="absolute bottom-5 left-5 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/36">
                  AIAIAC // Archive 2026
                </div>
              </div>
            </AnimatedSection>

            <div className="relative z-10 grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:gap-x-7">
              {keynotes.map((speaker, index) => (
                <AnimatedSection key={speaker.id} delay={0.1 + index * 0.1}>
                  <article className="group relative flex min-w-0 flex-col items-center">
                    <div className="relative h-88 w-full sm:h-96 md:h-108 lg:h-116 xl:h-124">
                      <img
                        src={speaker.image}
                        alt={`Portrait of previous-edition keynote speaker ${speaker.name}`}
                        width={index === 0 ? 1070 : 942}
                        height={index === 0 ? 993 : 941}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain object-bottom transition-transform duration-500 ease-out group-hover:-translate-y-1"
                      />
                    </div>

                    <div className="relative z-20 -mt-10 w-[92%] min-w-0 border-l-4 border-lime bg-bone px-5 py-5 text-mineral sm:-mt-12 sm:min-h-48 sm:px-6 sm:py-6 lg:min-h-44">
                      <p className="eyebrow text-forest">Previous-edition keynote</p>
                      <h3 className="mt-3 text-xl font-extrabold leading-[1.02] tracking-tight sm:text-[1.35rem] lg:text-2xl">
                        {speaker.name}
                      </h3>
                      <p className="mt-3 text-xs font-bold uppercase leading-snug tracking-[0.045em] text-mineral/80">
                        {speaker.role}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-snug text-mineral/58">
                        {speaker.organisation}
                      </p>
                      <p className="mt-4 border-t border-mineral/12 pt-3 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-forest">
                        {trackLabels[speaker.track] ?? speaker.track}
                      </p>
                    </div>
                  </article>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>

        <AnimatedSection delay={0.36} className="mt-10 flex items-center gap-4 xl:mt-8">
          <span className="h-px flex-1 bg-white/14" aria-hidden />
          <p className="eyebrow shrink-0 text-white/48">{previousEdition.label}</p>
          <span className="h-px w-8 bg-lime/60 sm:w-16" aria-hidden />
        </AnimatedSection>
      </div>
    </section>
  );
}
