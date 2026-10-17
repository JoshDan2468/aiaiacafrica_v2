import { AnimatedSection } from "@/components/common/AnimatedSection";
import { DynamicHeroBackground } from "@/components/layout/DynamicPageHero";

export function HeroSection() {
  return (
    <header className="relative w-full overflow-hidden bg-[#05190F] pb-14 pt-32 text-[#F7F5EF] sm:pb-16 sm:pt-36 lg:pb-20 lg:pt-40">
      <DynamicHeroBackground mode="ambient" />
      <div className="shell relative z-10 max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-5xl lg:text-[58px] lg:leading-[1.1]">
            Contact AIAIAC Africa 2027
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#BCC8C0] sm:text-[18px]">
            Contact the AIAIAC team regarding registration, sponsorship, exhibition, speaker
            participation, media enquiries or general event information.
          </p>
        </AnimatedSection>
      </div>
    </header>
  );
}
