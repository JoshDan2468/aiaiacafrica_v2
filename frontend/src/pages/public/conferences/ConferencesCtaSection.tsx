import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function ConferencesCtaSection() {
  return (
    <section className="bg-[#05190F] py-28 text-[#F7F5EF] sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 text-center sm:px-8 lg:px-12">
        <AnimatedSection className="mx-auto max-w-3xl">
          <h2 className="font-display text-[36px] font-extrabold uppercase leading-[1.05] tracking-tight text-[#F7F5EF] sm:text-[44px] lg:text-[48px] xl:text-[50px]">
            Participate in AIAIAC Africa 2027
          </h2>
          <p className="mx-auto mt-6 max-w-[640px] text-base leading-[1.65] text-[#BBC7BF] sm:text-[17px] lg:text-[17.5px]">
            Join technical professionals, industry leaders and technology providers in Lagos for two
            days of conference sessions, exhibition and professional exchange.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:mt-12">
            <Link
              to="/registration"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#CFEA3B] px-8 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#b8d62c]"
            >
              <span>Register Interest</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/registration/abstract"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-[#173D2D] px-8 text-base font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4f3b]"
            >
              <span>Submit an Abstract</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
