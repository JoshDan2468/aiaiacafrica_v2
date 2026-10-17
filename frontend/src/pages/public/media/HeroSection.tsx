import { AnimatedSection } from "@/components/common/AnimatedSection";
import { DynamicHeroBackground } from "@/components/layout/DynamicPageHero";
import mediaHeroImage from "@/data/AIAC_images/image6.jpg";

export function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-[#05190F] pb-16 pt-32 text-[#F7F5EF] sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <DynamicHeroBackground mode="ambient" />
      <div className="shell relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
          {/* Content Column: ~42-45% */}
          <AnimatedSection once className="lg:col-span-5">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-6xl lg:text-[66px] xl:text-[70px] lg:leading-[1.05]">
              Media
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#BCC8C0] sm:text-[18px]">
              News, event updates, photographs and media resources from AIAIAC Africa.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <a
                href="#highlights"
                className="inline-flex h-[50px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-7 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
              >
                View Highlights
              </a>
              <a
                href="#enquire"
                className="inline-flex h-[50px] items-center justify-center rounded-[14px] border border-white/20 bg-[#173D2D] px-6 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                Contact Media Team
              </a>
            </div>
          </AnimatedSection>

          {/* Media Column: ~55-58% */}
          <AnimatedSection delay={0.1} once className="lg:col-span-7">
            <div className="overflow-hidden rounded-[20px] bg-[#0A2619] shadow-2xl ring-1 ring-white/10">
              <img
                src={mediaHeroImage}
                alt="AIAIAC Africa conference delegates, leadership, and media engagement"
                width="1200"
                height="800"
                loading="eager"
                decoding="async"
                className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[500px] xl:h-[520px]"
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </header>
  );
}
