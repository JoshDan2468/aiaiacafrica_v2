import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { abstractSubmissionGuidance } from "@/data/brochure";

export function AbstractSubmissionSection() {
  return (
    <section id="abstracts" className="bg-[#071C13] py-28 text-[#F7F5EF] sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-20">
          {/* Left Column: Heading (42-50px) + Invitation Copy + Dual Curved CTAs */}
          <AnimatedSection className="lg:col-span-7">
            <h2 className="font-display text-[36px] font-extrabold uppercase tracking-tight text-[#F7F5EF] sm:text-[44px] lg:text-[48px] xl:text-[50px]">
              Submit an Abstract
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-[1.68] text-[#B7C3BA] sm:text-[17px] lg:text-[17.5px]">
              Industry practitioners, engineering researchers, and technical specialists are invited
              to submit technical abstracts for presentation at AIAIAC Africa 2027. Selected papers
              will be delivered across the four core conference disciplines.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4 sm:mt-11">
              <Link
                to="/registration/abstract"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#CFEA3B] px-8 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#b8d62c]"
              >
                <span>Submit an Abstract</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-transparent px-8 text-base font-semibold text-[#F7F5EF] transition-colors hover:bg-white/10"
              >
                <span>Contact Technical Committee</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </AnimatedSection>

          {/* Right Column: Key Submission Guidelines in Clean Editorial Format (NO generic SaaS card) */}
          <AnimatedSection delay={0.08} className="lg:col-span-5">
            <div className="space-y-7 border-l border-white/15 pl-6 sm:pl-8 lg:pl-10">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-[#CFEA3B]">
                  Submission Deadline
                </span>
                <p className="mt-1.5 text-2xl font-bold text-[#F7F5EF] sm:text-3xl">
                  {abstractSubmissionGuidance.deadline}
                </p>
              </div>

              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-[#CFEA3B]">
                  Abstract Length
                </span>
                <p className="mt-1.5 text-base font-medium text-[#F7F5EF] sm:text-[17px]">
                  Maximum {abstractSubmissionGuidance.maximumWords} words
                </p>
              </div>

              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-[#CFEA3B]">
                  Evaluation Criteria
                </span>
                <p className="mt-1.5 text-[15px] leading-[1.65] text-[#B7C3BA]">
                  {abstractSubmissionGuidance.reviewCriteria.join(" • ")}
                </p>
              </div>

              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-[#CFEA3B]">
                  Direct Enquiries
                </span>
                <p className="mt-1.5 text-[15px] text-[#B7C3BA]">
                  <a
                    href={"mailto:" + abstractSubmissionGuidance.contactEmail}
                    className="text-[#F7F5EF] underline decoration-[#CFEA3B] underline-offset-4 hover:text-[#CFEA3B]"
                  >
                    {abstractSubmissionGuidance.contactEmail}
                  </a>
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
