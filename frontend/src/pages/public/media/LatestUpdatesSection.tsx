import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

export function LatestUpdatesSection() {
  return (
    <section className="bg-[#F5F2E9] py-14 text-[#102C20] sm:py-16 lg:py-20">
      <div className="shell">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Latest Updates
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Updates from AIAIAC Africa 2027 will be published here as event announcements become
            available.
          </p>
          <div className="mt-8">
            <Link
              to="/contact?type=media"
              className="inline-flex h-[48px] items-center justify-center rounded-[14px] bg-[#173D2D] px-6 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
            >
              Contact the Media Team &rarr;
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
