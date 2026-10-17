import { AnimatedSection } from "@/components/common/AnimatedSection";
import { confirmedSponsors } from "@/data/sponsors";

export function ConfirmedSponsors() {
  return (
    <div className="bg-[#061E23] py-12" aria-label="AIAIAC Africa 2027 sponsors">
      <div className="shell grid gap-8">
        {(["diamond", "silver"] as const).map((tier) => (
          <AnimatedSection key={tier}>
            <h3 className="mb-5 text-base font-bold uppercase text-white">
              {tier === "diamond" ? "Diamond Sponsor" : "Silver Sponsors"}
            </h3>
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {confirmedSponsors
                .filter((sponsor) => sponsor.tier === tier)
                .map((sponsor) => (
                  <li key={sponsor.id} className="rounded-3xl bg-white p-5 sm:p-6">
                    <div className="flex h-20 items-center justify-center">
                      <img
                        src={sponsor.logo}
                        alt={`${sponsor.name} logo`}
                        loading="lazy"
                        decoding="async"
                        className="max-h-16 w-auto max-w-full object-contain"
                      />
                    </div>
                    <p className="sr-only">{sponsor.name}</p>
                  </li>
                ))}
            </ul>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}
