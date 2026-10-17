import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { DynamicHeroBackground } from "@/components/layout/DynamicPageHero";
import { aboutMedia } from "@/data/about";

export function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-[#05190F] pb-20 pt-32 text-[#F7F5EF] sm:pb-24 sm:pt-36 lg:pb-32 lg:pt-44">
      <DynamicHeroBackground mode="ambient" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-12 xl:gap-16">
          {/* Left Column: Heading + Direct Introduction + CTAs (~50% width) */}
          <AnimatedSection className="lg:col-span-6">
            <h1 className="font-display text-[38px] font-extrabold uppercase leading-[1.02] tracking-tight text-[#F7F5EF] sm:text-[48px] lg:text-[58px] xl:text-[64px]">
              About AIAIAC Africa 2027
            </h1>
            <div className="mt-6 max-w-[560px] space-y-3 text-base leading-[1.6] text-[#BBC7BF] sm:text-[17px]">
              <p>
                AIAIAC Africa 2027 brings together professionals across asset integrity, artificial
                intelligence, automation and cybersecurity for technical discussion, knowledge
                exchange, exhibition and professional networking.
              </p>
              <p className="font-medium text-[#F7F5EF]">
                The conference will take place in Lagos, Nigeria, on 22–23 June 2027.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/registration"
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] bg-[#CFEA3B] px-6 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#b8d62c] sm:h-[52px] sm:rounded-[14px]"
              >
                <span>Register Interest</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to="/conferences"
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-[#173D2D] px-6 text-base font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4f3b] sm:h-[52px] sm:rounded-[14px]"
              >
                <span>Explore Conferences</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </AnimatedSection>

          {/* Right Column: Approved Real Conference Photograph (~50% width, anchor scale) */}
          <AnimatedSection delay={0.08} className="lg:col-span-6">
            <div className="group relative overflow-hidden rounded-[10px] bg-[#071C13] shadow-2xl sm:rounded-[12px]">
              <img
                src={aboutMedia.hero.src}
                alt={aboutMedia.hero.alt}
                width={aboutMedia.hero.width}
                height={aboutMedia.hero.height}
                loading="eager"
                decoding="async"
                className="h-[340px] w-full object-cover transition-transform duration-[20000ms] ease-out will-change-transform group-hover:scale-[1.025] motion-reduce:transform-none sm:h-[400px] lg:h-[440px] xl:h-[480px]"
                style={{ objectPosition: aboutMedia.hero.objectPosition }}
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </header>
  );
}
