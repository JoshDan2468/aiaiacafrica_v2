import { AnimatedSection } from "@/components/common/AnimatedSection";
import { aboutMedia } from "@/data/about";

const audienceCategories = [
  {
    title: "Asset Owners & Operators",
    description:
      "Operating companies and facility leaders managing industrial plants, pipelines, offshore installations, and processing facilities.",
  },
  {
    title: "Oil, Gas & Energy Companies",
    description:
      "Upstream, midstream, downstream, and power generation enterprises driving regional energy production and infrastructure.",
  },
  {
    title: "Government & Regulators",
    description:
      "Policy authorities, standard-setting bodies, and regulatory agencies overseeing safety, compliance, and industrial standards.",
  },
  {
    title: "Engineering & Maintenance Professionals",
    description:
      "Engineers, inspectors, and reliability specialists responsible for facility uptime, structural integrity, and asset health.",
  },
  {
    title: "Technology Companies",
    description:
      "Enterprise software developers, industrial AI providers, and digital twin innovators delivering operational intelligence.",
  },
  {
    title: "Automation & Control Specialists",
    description:
      "Control systems engineers, instrumentation leads, and SCADA architects optimizing plant automation and efficiency.",
  },
  {
    title: "Cybersecurity Professionals",
    description:
      "OT security directors, threat intelligence specialists, and industrial cybersecurity leaders protecting mission-critical networks.",
  },
  {
    title: "Technical Service Providers",
    description:
      "Specialist inspection bodies, non-destructive testing companies, and EPC contractors executing asset integrity programs.",
  },
];

export function WhoAttendsSection() {
  return (
    <section className="bg-[#071C13] py-24 text-[#F7F5EF] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight text-[#F7F5EF] sm:text-[40px] lg:text-[46px]">
            Who Attends
          </h2>
          <p className="mt-4 max-w-[680px] text-base leading-[1.6] text-[#B7C3BA] sm:text-[17px]">
            AIAIAC Africa convenes technical decision-makers, engineering authorities, and executive
            stakeholders from across the industrial value chain.
          </p>
        </AnimatedSection>

        {/* Audience Groups: 3 columns desktop, 2 columns tablet, 1 column mobile. Clean editorial typography, NO cards */}
        <div className="mt-14 grid gap-x-10 gap-y-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-12">
          {audienceCategories.map((group, index) => (
            <AnimatedSection key={group.title} delay={index * 0.03} className="space-y-2">
              <h3 className="text-[18px] font-semibold text-[#F7F5EF] sm:text-[19px] lg:text-[20px]">
                {group.title}
              </h3>
              <p className="text-[14.5px] leading-[1.65] text-[#B7C3BA] sm:text-[15.5px]">
                {group.description}
              </p>
            </AnimatedSection>
          ))}
        </div>

        {/* Human / Event Image: Substantial conference group gathering photograph */}
        <AnimatedSection delay={0.12} className="mt-16 sm:mt-20 lg:mt-24">
          <div className="overflow-hidden rounded-[10px] bg-[#0B2A1D] shadow-2xl sm:rounded-[12px]">
            <img
              src={aboutMedia.audience.src}
              alt={aboutMedia.audience.alt}
              width={aboutMedia.audience.width}
              height={aboutMedia.audience.height}
              loading="lazy"
              decoding="async"
              className="aspect-16/9 w-full object-cover sm:aspect-21/9"
              style={{ objectPosition: aboutMedia.audience.objectPosition }}
            />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
