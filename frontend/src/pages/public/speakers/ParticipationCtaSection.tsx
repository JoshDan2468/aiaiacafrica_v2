import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function ParticipationCtaSection() {
  return (
    <section className="bg-[#05190F] py-24 text-[#F7F5EF] sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 text-center sm:px-8 lg:px-12">
        <AnimatedSection className="mx-auto max-w-3xl">
          <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#F7F5EF] sm:text-[38px] lg:text-[46px]">
            Contribute to AIAIAC Africa 2027
          </h2>
          <p className="mt-5 text-base leading-[1.68] text-[#B6C2BA] sm:text-[17px] lg:text-[18px]">
            Professionals interested in contributing technical work can submit an abstract for
            consideration.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/conferences#abstract-submission"
              className="inline-flex h-[52px] items-center justify-center rounded-[12px] bg-[#CFEA3B] px-8 text-[15.5px] font-bold text-[#102C20] transition hover:bg-[#b8d234] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B] sm:rounded-[14px]"
            >
              Submit an Abstract &rarr;
            </Link>
            <Link
              to="/conferences"
              className="inline-flex h-[52px] items-center justify-center rounded-[12px] border border-white/15 bg-[#173D2D] px-8 text-[15.5px] font-semibold text-[#F7F5EF] transition hover:bg-[#20523C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B] sm:rounded-[14px]"
            >
              Explore Conferences &rarr;
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
