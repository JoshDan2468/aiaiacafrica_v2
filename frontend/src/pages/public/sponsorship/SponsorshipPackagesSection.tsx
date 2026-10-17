import { AnimatedSection } from "@/components/common/AnimatedSection";
import { getWhatsAppEnquiryUrl } from "@/data/eventContactConfig";

import { sponsorshipPackages } from "@/data/brochure";

export function SponsorshipPackagesSection() {
  return (
    <section
      id="packages"
      aria-labelledby="sponsorship-opportunities-title"
      className="bg-[#E8EEE8] py-20 text-[#102C20] sm:py-24 lg:py-28"
    >
      <div className="shell">
        <AnimatedSection className="max-w-3xl">
          <h2
            id="sponsorship-opportunities-title"
            className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]"
          >
            Sponsorship Opportunities
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#3F5347]">
            Choose your platform for visibility, connection and impact. Explore the six sponsorship
            levels in the latest AIAIAC Africa 2027 brochure.
          </p>
        </AnimatedSection>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7 lg:gap-8">
          {sponsorshipPackages.map((tier, index) => (
            <AnimatedSection key={tier.id} delay={index * 0.04}>
              <article className="flex h-full flex-col justify-between rounded-[20px] border border-[#D8DDD5] bg-[#F6F2E8] p-7 sm:p-9 shadow-xs transition-shadow hover:shadow-md">
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[26px]">
                    {tier.title}
                  </h3>
                  <p className="mt-3 text-xl font-semibold text-forest">{tier.priceLabel}</p>

                  <ul className="mt-6 space-y-3.5 text-[15.5px] leading-relaxed text-[#4F6258]">
                    {tier.highlights?.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3">
                        <svg
                          className="mt-1 size-4 shrink-0 text-[#3D5A47]"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M13.3334 4L6.00008 11.3333L2.66675 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-9 pt-2">
                  <a
                    href={getWhatsAppEnquiryUrl(
                      "SPONSORSHIP",
                      `Hello AIAIAC Africa team. I would like information about ${tier.title} for AIAIAC Africa 2027.`,
                    )}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#173D2D] px-6 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                  >
                    <span>Enquire About {tier.title}</span>
                  </a>
                </div>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
