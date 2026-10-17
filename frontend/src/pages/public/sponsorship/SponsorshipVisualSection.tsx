import { AnimatedSection } from "@/components/common/AnimatedSection";
import plenaryImage from "@/data/AIAC_images/image20.jpg";

export function SponsorshipVisualSection() {
  return (
    <section className="bg-[#FFFFFF] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Connect with Industry Leaders and Technical Professionals
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-[17px] leading-relaxed text-[#3F5347]">
            Sponsors gain continuous direct engagement with delegates across the plenary hall,
            executive roundtables, and technical conference tracks throughout the two-day summit.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.12} className="mx-auto mt-12 max-w-5xl">
          <div className="overflow-hidden rounded-[20px] shadow-xl ring-1 ring-black/5">
            <img
              src={plenaryImage}
              alt="AIAIAC Africa grand conference plenary assembly with energy operators, engineers, and industry partners"
              width="1440"
              height="800"
              loading="lazy"
              decoding="async"
              className="h-[380px] w-full object-cover sm:h-[480px] lg:h-[540px]"
            />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
