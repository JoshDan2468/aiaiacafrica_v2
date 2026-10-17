import { AnimatedSection } from "@/components/common/AnimatedSection";
import { aboutMedia } from "@/data/about";

const whyThemes = [
  {
    title: "Asset Performance and Reliability",
    description:
      "Addressing structural degradation, extending facility lifecycles, and maintaining mechanical integrity across mission-critical energy assets.",
  },
  {
    title: "Digital Transformation",
    description:
      "Harnessing machine learning, predictive analytics, and digital twins for intelligent operational decision-making.",
  },
  {
    title: "Automation and Operational Efficiency",
    description:
      "Integrating automated inspection robotics, smart instrumentation, and modern control architectures to streamline operations and reduce unplanned downtime.",
  },
  {
    title: "Industrial Cybersecurity",
    description:
      "Protecting SCADA systems, industrial control networks, and operational technology against sophisticated digital threats.",
  },
  {
    title: "Technical Knowledge Exchange",
    description:
      "Providing a dedicated technical forum where plant operators, service providers, regulators, and international authorities share proven methodologies and field case studies.",
  },
];

export function WhySection() {
  return (
    <section className="bg-[#FFFFFF] py-24 text-[#102C20] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14 xl:gap-18">
          {/* Left Column: Approved Real Conference Speaker / Stage Photograph (~45% width, substantial height) */}
          <AnimatedSection className="lg:col-span-5">
            <div className="overflow-hidden rounded-[10px] bg-[#F5F2E9] shadow-lg sm:rounded-[12px] lg:sticky lg:top-28">
              <img
                src={aboutMedia.technology.src}
                alt={aboutMedia.technology.alt}
                width={aboutMedia.technology.width}
                height={aboutMedia.technology.height}
                loading="lazy"
                decoding="async"
                className="h-[380px] w-full object-cover sm:h-[460px] lg:h-[540px] xl:h-[580px]"
                style={{ objectPosition: aboutMedia.technology.objectPosition }}
              />
            </div>
          </AnimatedSection>

          {/* Right Column: Heading + Direct Intro + 5 Thematic Areas (~55% width, NO boxes, NO cards) */}
          <AnimatedSection delay={0.08} className="lg:col-span-7">
            <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[40px] lg:text-[44px]">
              Why AIAIAC Africa 2027
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-[1.6] text-[#4A5850] sm:text-[17px]">
              Industrial operations increasingly depend on reliable assets, connected systems and
              secure digital infrastructure. AIAIAC Africa 2027 brings these disciplines together to
              support practical technical exchange and industry collaboration.
            </p>

            {/* Thematic areas as clean editorial headings (Title Case, 600) + concise descriptions (22-30px spacing) */}
            <div className="mt-10 space-y-6 sm:space-y-7">
              {whyThemes.map((item) => (
                <div key={item.title} className="space-y-1.5">
                  <h3 className="text-[17px] font-semibold text-[#102C20] sm:text-[18px]">
                    {item.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.6] text-[#55635B] sm:text-[15.5px]">
                    {item.description}
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
