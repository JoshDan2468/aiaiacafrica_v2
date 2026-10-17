import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { DynamicHeroBackground } from "@/components/layout/DynamicPageHero";
import sponsorshipHeroImage from "@/data/AIAC_images/image6.jpg";
import { conference } from "@/data/conference";

export function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-[#05190F] pb-16 pt-32 text-[#F7F5EF] sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <DynamicHeroBackground mode="ambient" />
      <div className="shell relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
          <AnimatedSection className="lg:col-span-6 xl:col-span-6">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-6xl lg:text-[64px] xl:text-[70px] lg:leading-[1.05]">
              Partner with <br />
              <span className="text-[#CFEA3B]">AIAIAC Africa 2027</span>
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#BCC8C0] sm:text-lg">
              Connect your organisation with professionals and decision-makers across asset
              integrity, artificial intelligence, automation and cybersecurity.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-[#CFEA3B]">
              <span>22–23 June 2027</span>
              <span className="text-white/30">•</span>
              <span className="text-[#E0E7E2]">{conference.venue}</span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <Link
                to="/registration/sponsor"
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-7 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
              >
                Make a Sponsorship Enquiry
              </Link>
              <a
                href="#enquire"
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-[rgba(247,245,239,0.28)] bg-transparent px-6 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                Request Sponsorship Information
              </a>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.12} className="lg:col-span-6 xl:col-span-6">
            <div className="overflow-hidden rounded-[20px] bg-[#0A2619] shadow-2xl ring-1 ring-white/10">
              <img
                src={sponsorshipHeroImage}
                alt="AIAIAC Africa partnership leadership and verified conference partner backdrop"
                width="1200"
                height="800"
                loading="eager"
                decoding="async"
                className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[520px] xl:h-[550px]"
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </header>
  );
}
