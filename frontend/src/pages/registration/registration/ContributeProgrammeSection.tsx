import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { abstractSubmissionGuidance } from "@/data/brochure";

interface ContributeProgrammeSectionProps {
  onSelectEnquiryType: (type: string) => void;
}

export function ContributeProgrammeSection({
  onSelectEnquiryType,
}: ContributeProgrammeSectionProps) {
  return (
    <section
      id="contribute-programme"
      className="bg-[#F5F2E9] py-10 text-[#102C20] sm:py-12 lg:py-14"
    >
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-3xl">
            Contribute to the Programme
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Share technical innovations, operational case studies, or cover the conference as an
            accredited media partner.
          </p>
        </AnimatedSection>

        {/* Editorial Abstract Section — No Generic White Card */}
        <AnimatedSection delay={0.05} once className="mt-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Abstract Details */}
            <div className="lg:col-span-8">
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[28px]">
                Submit an Abstract
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
                Submit original research, technical innovations or operational case studies for
                consideration by the technical committee.
              </p>

              {/* Confirmed Abstract Details */}
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="block text-[14.5px] font-bold text-[#102C20]">
                    Submission Deadline
                  </span>
                  <span className="text-[16px] font-medium text-[#2F4439]">
                    {abstractSubmissionGuidance.deadline}
                  </span>
                </div>
                <div>
                  <span className="block text-[14.5px] font-bold text-[#102C20]">
                    Maximum Abstract Length
                  </span>
                  <span className="text-[16px] font-medium text-[#2F4439]">
                    {abstractSubmissionGuidance.maximumWords} words
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[14px] leading-relaxed text-[#5A6D62]">
                Submission is subject to review and does not guarantee a speaking slot.
              </p>
            </div>

            {/* Right Column: Primary CTA */}
            <div className="lg:col-span-4 lg:text-right">
              <Link
                to="/registration/abstract"
                className="inline-flex h-[52px] items-center justify-center  bg-[#CFEA3B] px-8 text-[15px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
              >
                Submit an Abstract
              </Link>
            </div>
          </div>
        </AnimatedSection>

        {/* Media Enquiries — Simple Editorial Row */}
        <AnimatedSection delay={0.1} once className="mt-8 border-t border-[#DCD5C5] pt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-display text-xl font-bold tracking-tight text-[#102C20] sm:text-[22px]">
                Media Enquiries
              </h4>
              <p className="mt-1.5 text-[15.5px] leading-relaxed text-[#3F5347]">
                For press credentials, event media partnerships, and official conference coverage.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href="#enquiry-form"
                onClick={() => onSelectEnquiryType("Media Enquiry")}
                className="inline-flex items-center gap-1.5 text-[15.5px] font-bold text-[#173D2D] hover:underline"
              >
                <span>Contact the Media Team</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
