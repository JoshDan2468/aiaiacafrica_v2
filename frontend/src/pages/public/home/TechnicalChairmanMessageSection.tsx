import { AnimatedSection } from "@/components/common/AnimatedSection";
import { CompanyLogoBadge } from "@/components/common/CompanyLogoBadge";
import { CountryBadge } from "@/components/common/CountryFlag";
import { technicalChairman, technicalChairmanHomepageMessage } from "@/data/committee";

export function TechnicalChairmanMessageSection() {
  return (
    <section
      id="technical-chairman-message"
      aria-labelledby="technical-chairman-message-title"
      className="relative overflow-hidden bg-[#020b07] py-14 sm:py-18 lg:py-20"
    >
      <div className="grid-lines absolute inset-0 opacity-20" aria-hidden />

      <div className="shell relative max-w-6xl">
        <AnimatedSection>
          <article className="relative isolate pt-0 lg:pt-6">
            <div
              className="editorial-panel absolute inset-x-0 bottom-0 top-0 border border-lime/40 bg-[#07170f] rounded-2xl lg:top-2"
              aria-hidden
            />
            <div
              className="editorial-panel absolute bottom-0 right-0 top-0 hidden w-[38%] rounded-r-2xl bg-[#0b2018] lg:block lg:top-6"
              aria-hidden
            />

            <div className="relative z-20 grid px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10 md:px-10 lg:min-h-[28rem] lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-10 lg:px-12 lg:pb-10 lg:pt-12">
              <div className="order-1 max-w-3xl lg:col-start-1 lg:row-start-1">
                <h2
                  id="technical-chairman-message-title"
                  className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl"
                >
                  An Invitation to Attend
                </h2>
              </div>

              <AnimatedSection
                delay={0.12}
                className="order-2 relative mt-6 h-64 sm:h-72 lg:col-start-2 lg:row-[1/4] lg:mt-0 lg:h-auto lg:self-stretch"
              >
                {technicalChairman.image && (
                  <img
                    src={technicalChairman.image}
                    alt={`Portrait of ${technicalChairman.name}, Technical Chairman`}
                    width={320}
                    height={320}
                    loading="lazy"
                    decoding="async"
                    className="absolute bottom-0 left-1/2 max-h-full w-auto max-w-full -translate-x-1/2 object-contain object-bottom lg:bottom-6 lg:max-h-80"
                  />
                )}
              </AnimatedSection>

              <AnimatedSection
                delay={0.18}
                className="order-3 mt-6 border-l border-lime/50 pl-4 lg:col-start-1 lg:row-start-3 lg:mt-6 lg:max-w-lg"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  {technicalChairman.countryCode && (
                    <CountryBadge code={technicalChairman.countryCode} />
                  )}
                  {technicalChairman.organisationKey && (
                    <CompanyLogoBadge
                      organisationKey={technicalChairman.organisationKey}
                      organisationName={technicalChairman.organisation}
                    />
                  )}
                </div>
                <h3 className="font-display text-lg font-bold leading-tight text-white sm:text-xl">
                  {technicalChairman.name}
                </h3>
                <p className="mt-1 text-xs font-semibold text-white/80">{technicalChairman.role}</p>
                <p className="mt-0.5 text-xs text-white/55">{technicalChairman.organisation}</p>
              </AnimatedSection>

              <div className="order-4 mt-6 max-w-2xl lg:order-2 lg:col-start-1 lg:row-start-2 lg:mt-6 lg:self-start">
                <p className="max-w-[65ch] border-t border-white/12 pt-3 text-justify text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                  {technicalChairmanHomepageMessage.text}
                </p>
              </div>
            </div>
          </article>
        </AnimatedSection>
      </div>
    </section>
  );
}
