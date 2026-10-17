import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { ConfirmedSponsors } from "@/components/partners/ConfirmedSponsors";
import { sponsors } from "@/data/sponsors";

export function SponsorArchiveSection() {
  const mediaPartners = sponsors.filter((sponsor) => sponsor.tier === "media");
  return (
    <section
      id="sponsors"
      aria-label="Sponsorship and partnership"
      className="bg-[#061E23] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="sponsor-call-banner overflow-hidden border-y border-lime/25 bg-lime py-5 text-[#061E23]"
        aria-label="Call for Sponsors"
      >
        <h2 className="sr-only">Call for Sponsors</h2>
        <div className="sponsor-call-track" aria-hidden="true">
          {[0, 1].map((group) => (
            <div key={group} className="sponsor-call-group">
              {[0, 1, 2, 3].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-8 whitespace-nowrap font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl"
                >
                  Call for Sponsors{" "}
                  <span className="text-2xl" aria-hidden="true">
                    ↗
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="shell">
        <AnimatedSection className="flex flex-col gap-6 border-b border-white/15 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-base leading-7 text-white/80">
            Put your brand at the heart of AIAIAC Africa 2027. Connect with industry leaders,
            showcase your solutions, and explore sponsorship and partnership opportunities.
          </p>
          <ActionLink
            to="/sponsorship"
            variant="primary"
            size="lg"
            className="shrink-0 self-start sm:self-auto"
          >
            Become a Sponsor or Partner
          </ActionLink>
        </AnimatedSection>
      </div>
      <ConfirmedSponsors />
      {mediaPartners.length > 0 && (
        <div className="shell">
          <div className="mb-5">
            <p className="text-base font-bold uppercase text-white">Official Media Partners</p>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {mediaPartners.map((partner) => (
              <li
                key={partner.id}
                className="flex h-32 items-center justify-center rounded-3xl bg-white p-5 sm:p-6"
              >
                <img
                  src={partner.logo}
                  alt={partner.name ? `${partner.name} logo` : "Media partner logo"}
                  loading="lazy"
                  decoding="async"
                  className="max-h-16 w-auto max-w-full object-contain"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
