import { AnimatedSection } from "@/components/common/AnimatedSection";

const partnerReasons = [
  {
    title: "Brand Visibility",
    description:
      "Prominent corporate positioning across all international conference marketing, plenary stage backdrops, programme publications, and digital communication platforms.",
  },
  {
    title: "Industry Engagement",
    description:
      "Direct technical dialogue and commercial engagement with facility managers, chief engineers, and operations directors representing regional asset infrastructure.",
  },
  {
    title: "Conference Participation",
    description:
      "Executive panel contributions, plenary keynote opportunities, and specialised technical sessions addressing asset integrity and operational technology challenges.",
  },
  {
    title: "Exhibition Visibility",
    description:
      "Dedicated high-footfall exhibition presence in the primary delegate atrium to demonstrate operational technology, inspection systems, and software platforms.",
  },
  {
    title: "Professional Audience",
    description:
      "Direct access to a focused delegation of senior engineering authorities, safety regulators, asset owners, and cybersecurity decision-makers from across Africa.",
  },
  {
    title: "Strategic Networking",
    description:
      "Curated bilateral commercial meetings, executive networking roundtables, and high-level engagements with energy operators and public-sector authorities.",
  },
];

export function WhyPartnerSection() {
  return (
    <section className="bg-[#F5F2E9] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Why Partner
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#3F5347]">
            AIAIAC Africa connects your organisation with operational leaders, chief engineers, and
            decision-makers setting technical strategy across West Africa&apos;s critical
            infrastructure.
          </p>
        </AnimatedSection>

        <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-16">
          {partnerReasons.map((item, index) => (
            <AnimatedSection key={item.title} delay={index * 0.04}>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#102C20] sm:text-[22px]">
                {item.title}
              </h3>
              <p className="mt-3 text-[15.5px] leading-[1.65] text-[#3F5347]">{item.description}</p>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
