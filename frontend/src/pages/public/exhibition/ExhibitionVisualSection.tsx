import { AnimatedSection } from "@/components/common/AnimatedSection";
import exhibitionVisualPhoto from "@/data/AIAC_images/image20.jpg";

export function ExhibitionVisualSection() {
  return (
    <section className="bg-white py-20 text-[#102C20] lg:py-24">
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Connect with Industry Professionals
          </h2>
          <p className="mt-5 text-[16.5px] leading-relaxed text-[#4A5D52] sm:text-[17.5px]">
            The AIAIAC Africa exhibition floor operates directly alongside the technical conference
            tracks, providing direct interaction as engineers, asset managers, and technical
            specialists move between keynote plenary sessions, specialist presentations, and
            scheduled networking breaks.
          </p>
        </AnimatedSection>

        {/* Dominant Real Event Exhibition Photograph */}
        <AnimatedSection delay={0.08} className="mx-auto mt-12 max-w-[960px] sm:mt-14">
          <div className="overflow-hidden rounded-[22px] shadow-xl">
            <img
              src={exhibitionVisualPhoto}
              alt="Industry delegates, engineering specialists, and operating company leaders convening at AIAIAC Africa"
              width="1400"
              height="850"
              loading="lazy"
              decoding="async"
              className="h-[400px] w-full object-cover object-center sm:h-[520px] lg:h-[620px]"
            />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
