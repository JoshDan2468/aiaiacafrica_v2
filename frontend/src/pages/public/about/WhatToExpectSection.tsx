import { AnimatedSection } from "@/components/common/AnimatedSection";
import { aboutMedia } from "@/data/about";

const programmeExperiences = [
  {
    title: "Executive Sessions",
    description:
      "Strategic ministerial briefings, industry panels, and policy dialogues addressing Africa's energy transition, infrastructure modernization, and industrial governance.",
  },
  {
    title: "Technical Conferences",
    description:
      "Dual dedicated tracks delivering specialized technical presentations across Asset Integrity & Corrosion Management and Industrial Automation & OT Cybersecurity.",
  },
  {
    title: "Technical Presentations",
    description:
      "Rigorous, peer-reviewed engineering case studies, field methodologies, and practical solutions presented by operational practitioners.",
  },
  {
    title: "Innovation Showcase",
    description:
      "Live demonstrations of industrial robotics, sensor telemetry, autonomous inspection tools, and enterprise AI software in active operational settings.",
  },
  {
    title: "Exhibition",
    description:
      "A focused exhibition floor featuring international technology developers, equipment manufacturers, and specialist engineering service providers.",
  },
  {
    title: "Executive Roundtables",
    description:
      "Closed-door, Chatham House-style discussions bringing together asset operators, EPC contractors, and regulators to tackle pressing operational challenges.",
  },
  {
    title: "Professional Networking",
    description:
      "Facilitated bilateral meetings, executive receptions, and structured networking sessions connecting delegates across two high-impact conference days.",
  },
];

export function WhatToExpectSection() {
  return (
    <section className="bg-[#E8EEE8] py-24 text-[#102C20] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-12 xl:gap-16">
          {/* LEFT: ~58% width (lg:col-span-7) */}
          <div className="lg:col-span-7">
            <AnimatedSection className="max-w-[620px]">
              <h2 className="font-display text-[34px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[40px] lg:text-[44px]">
                What to Expect
              </h2>
              <p className="mt-4 text-base leading-[1.6] text-[#4A5850] sm:text-[17px]">
                A comprehensive two-day programme combining strategic industry perspective with deep
                technical investigation, practical demonstrations, and high-value networking.
              </p>
            </AnimatedSection>

            {/* Clean 2-column editorial list of all 7 programme experiences. NO cards, NO borders, NO icons, NO numbers */}
            <div className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 sm:gap-y-8 lg:gap-x-10">
              {programmeExperiences.map((item, index) => (
                <AnimatedSection key={item.title} delay={index * 0.04} className="space-y-1.5">
                  <h3 className="text-[17.5px] font-semibold text-[#102C20] sm:text-[18.5px]">
                    {item.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.6] text-[#55635B] sm:text-[15.5px]">
                    {item.description}
                  </p>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* RIGHT: ~42% width (lg:col-span-5) - ONE large, visually substantial approved event photograph */}
          <AnimatedSection delay={0.1} className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-[10px] bg-[#D6DFD6] shadow-lg sm:rounded-[12px]">
              <img
                src={aboutMedia.introduction.src}
                alt={aboutMedia.introduction.alt}
                width={aboutMedia.introduction.width}
                height={aboutMedia.introduction.height}
                loading="lazy"
                decoding="async"
                className="h-[380px] w-full object-cover sm:h-[460px] lg:h-[520px] xl:h-[580px]"
                style={{ objectPosition: aboutMedia.introduction.objectPosition }}
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
