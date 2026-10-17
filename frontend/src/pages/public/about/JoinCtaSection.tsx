import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function JoinCtaSection() {
  return (
    <section className="bg-[#05190F] py-24 text-[#F7F5EF] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 text-center sm:px-8 lg:px-12">
        <AnimatedSection className="mx-auto max-w-3xl">
          <h2 className="font-display text-[34px] font-extrabold uppercase leading-[1.05] tracking-tight text-[#F7F5EF] sm:text-[40px] lg:text-[46px]">
            Join AIAIAC Africa 2027
          </h2>
          <p className="mx-auto mt-5 max-w-[620px] text-base leading-[1.6] text-[#BBC7BF] sm:text-[17px]">
            Join industry professionals in Lagos for two days of technical discussion, knowledge
            exchange, exhibition and professional networking.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/registration"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] bg-[#CFEA3B] px-8 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#b8d62c] sm:h-[52px] sm:rounded-[14px]"
            >
              <span>Register Interest</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/conferences"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-[#173D2D] px-8 text-base font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4f3b] sm:h-[52px] sm:rounded-[14px]"
            >
              <span>Explore Conferences</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
