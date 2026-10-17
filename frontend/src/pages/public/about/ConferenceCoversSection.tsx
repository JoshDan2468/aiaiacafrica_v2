import { AnimatedSection } from "@/components/common/AnimatedSection";
import { aboutMedia } from "@/data/about";

const technicalAreas = [
  {
    title: "Asset Integrity",
    description:
      "Advanced engineering methodologies for asset reliability, non-destructive inspection, corrosion management, structural health monitoring, and sustained operational performance across critical facilities.",
  },
  {
    title: "Artificial Intelligence",
    description:
      "Practical deployment of industrial AI models, machine learning, predictive analytics, digital systems, and operational decision support in live operating environments.",
  },
  {
    title: "Automation",
    description:
      "Modern industrial automation, smart field instrumentation, autonomous inspection robotics, and distributed control systems driving operational efficiency.",
  },
  {
    title: "Cybersecurity",
    description:
      "Operational technology (OT) network defence, SCADA resilience architectures, threat intelligence, and critical infrastructure protection.",
  },
];

export function ConferenceCoversSection() {
  return (
    <section className="bg-[#F6F3EB] py-24 text-[#102C20] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        {/* Section Header: Direct title + concise introductory copy. NO eyebrow labels */}
        <AnimatedSection className="max-w-[700px]">
          <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[40px] lg:text-[44px]">
            What the Conference Covers
          </h2>
          <p className="mt-4 text-base leading-[1.6] text-[#4A5850] sm:text-[17px]">
            AIAIAC Africa brings together four connected technical disciplines that directly
            determine operational performance, facility lifecycle integrity, and digital readiness
            across asset-intensive industries.
          </p>
        </AnimatedSection>

        {/* Four Technical Areas: Editorial 2x2 composition on desktop. NO rectangular cards, NO borders, NO numbering */}
        <div className="mt-14 grid gap-x-12 gap-y-10 sm:mt-16 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-12 xl:gap-x-20">
          {technicalAreas.map((area, index) => (
            <AnimatedSection key={area.title} delay={index * 0.05} className="space-y-2.5">
              <h3 className="font-display text-[21px] font-bold uppercase tracking-tight text-[#102C20] sm:text-[23px]">
                {area.title}
              </h3>
              <p className="text-[15px] leading-[1.65] text-[#4A5850] sm:text-[16px]">
                {area.description}
              </p>
            </AnimatedSection>
          ))}
        </div>

        {/* Large Image Break: Substantial conference photo giving a visual pause (~75-85% container width) */}
        <AnimatedSection delay={0.12} className="mt-16 sm:mt-24 lg:mt-28">
          <div className="mx-auto max-w-[1060px] overflow-hidden rounded-[10px] bg-[#EBE6DC] shadow-lg sm:rounded-[12px]">
            <img
              src={aboutMedia.regional.src}
              alt={aboutMedia.regional.alt}
              width={aboutMedia.regional.width}
              height={aboutMedia.regional.height}
              loading="lazy"
              decoding="async"
              className="aspect-16/10 min-h-[300px] w-full object-cover sm:aspect-21/9 sm:min-h-[400px]"
              style={{ objectPosition: aboutMedia.regional.objectPosition }}
            />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
