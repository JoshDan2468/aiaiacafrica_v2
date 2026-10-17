import { AnimatedSection } from "@/components/common/AnimatedSection";
import formatsImage from "@/data/AIAC_images/image4.jpg";

const programmeFormats = [
  {
    title: "Technical Sessions",
    description:
      "Specialised technical sessions delivering in-depth engineering methodologies, empirical research, and operational field evaluations across critical industrial infrastructure.",
  },
  {
    title: "Panel Discussions",
    description:
      "Cross-sector discussions bringing together plant operators, engineering service providers, and technology innovators to explore complex operational challenges.",
  },
  {
    title: "Technical Presentations",
    description:
      "Practitioner-led presentations highlighting practical engineering solutions, case study findings, and empirical field results from active operations.",
  },
  {
    title: "Executive Discussions",
    description:
      "High-level strategic dialogues focused on capital allocation, regional energy transition policies, regulatory frameworks, and operational governance.",
  },
  {
    title: "Innovation Showcase",
    description:
      "Live operational demonstrations of industrial inspection robotics, autonomous crawlers, sensor telemetry, and enterprise AI diagnostic platforms.",
  },
  {
    title: "Exhibition",
    description:
      "A concentrated industrial exhibition featuring international engineering firms, hardware manufacturers, and specialised inspection service providers.",
  },
  {
    title: "Professional Networking",
    description:
      "Structured bilateral meetings, executive receptions, and peer exchanges connecting delegates, asset operators, and technical decision-makers across both conference days.",
  },
];

export function ProgrammeFormatsSection() {
  return (
    <section className="bg-[#F5F2E9] py-28 text-[#102C20] sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14 xl:gap-20">
          {/* Left Column: Approved Real Conference Photograph (~46% width, sticky) */}
          <AnimatedSection className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-[10px] bg-[#EBE6DC] shadow-xl sm:rounded-[12px]">
              <img
                src={formatsImage}
                alt="Conference hall session at AIAIAC Africa"
                width={1200}
                height={800}
                loading="eager"
                decoding="async"
                className="h-[400px] w-full object-cover sm:h-[480px] lg:h-[560px] xl:h-[620px]"
              />
            </div>
          </AnimatedSection>

          {/* Right Column: Heading + Intro + 7 Programme Formats in Clean Editorial Stack (~54% width) */}
          <AnimatedSection delay={0.08} className="lg:col-span-7">
            <h2 className="font-display text-[36px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[42px] lg:text-[46px]">
              Programme Formats
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-[1.65] text-[#4A5850] sm:text-[17px]">
              Structured formats engineered for practical technical knowledge transfer, empirical
              debate, and high-value industry collaboration across two concentrated days.
            </p>

            {/* Formats list: NO cards, NO boxes, NO decorative numbers */}
            <div className="mt-12 space-y-8 sm:space-y-9">
              {programmeFormats.map((format) => (
                <div key={format.title} className="space-y-2">
                  <h3 className="text-[18px] font-semibold text-[#102C20] sm:text-[19px]">
                    {format.title}
                  </h3>
                  <p className="text-[15px] leading-[1.62] text-[#55635B] sm:text-[15.5px]">
                    {format.description}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
