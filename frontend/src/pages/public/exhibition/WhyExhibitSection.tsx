import { AnimatedSection } from "@/components/common/AnimatedSection";

const exhibitionReasons = [
  {
    title: "Brand Visibility",
    description:
      "Position your organisation at the forefront of the region's asset integrity, automation, and industrial cybersecurity modernization agenda across event marketing, conference proceedings, and media coverage.",
  },
  {
    title: "Industry Connections",
    description:
      "Engage directly with asset owners, operating company executives, EPC contractors, maintenance directors, and regulatory authorities actively evaluating certified industrial solutions for critical infrastructure.",
  },
  {
    title: "Technology Showcase",
    description:
      "Present physical hardware, robotics, autonomous inspection tools, digital twins, and OT cybersecurity platforms in operational application contexts to qualified engineering and technology evaluators.",
  },
  {
    title: "Business Development",
    description:
      "Connect with enterprise procurement teams, asset integrity managers, and engineering heads planning active capital expenditure, scheduled maintenance overhauls, and long-term facility modernization programmes.",
  },
  {
    title: "Professional Networking",
    description:
      "Participate in high-level executive networking, technical track discussions, and industry roundtables that influence future procurement specifications and regional engineering standards.",
  },
];

export function WhyExhibitSection() {
  return (
    <section className="bg-[#F5F2E9] py-20 text-[#102C20] lg:py-24">
      <div className="shell max-w-[1280px]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Heading and Context (~40%) */}
          <AnimatedSection className="lg:col-span-5">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px] lg:leading-[1.1]">
              Why Exhibit
            </h2>

            <p className="mt-6 text-[16px] leading-[1.65] text-[#4A5D52] sm:text-[17px]">
              Exhibiting at AIAIAC Africa places your engineering capabilities, commercial products,
              and specialised technical services directly in front of the organisations responsible
              for safeguarding vital energy and industrial assets.
            </p>

            <p className="mt-4 text-[16px] leading-[1.65] text-[#4A5D52] sm:text-[17px]">
              With dedicated exhibition hours synchronized with plenary breaks and technical track
              transitions, exhibitors benefit from concentrated, high-level interaction with
              technical and commercial leadership.
            </p>
          </AnimatedSection>

          {/* Right Column: Editorial Benefits (~60%) */}
          <div className="space-y-10 lg:col-span-7 sm:space-y-11">
            {exhibitionReasons.map((reason, index) => (
              <AnimatedSection key={reason.title} delay={index * 0.05}>
                <div>
                  <h3 className="font-display text-[20px] font-bold text-[#102C20] sm:text-[22px]">
                    {reason.title}
                  </h3>
                  <p className="mt-2.5 text-[15.5px] leading-[1.65] text-[#4A5D52] sm:text-[16px]">
                    {reason.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
