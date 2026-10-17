import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

interface AttendConferenceSectionProps {
  onSelectEnquiryType: (type: string) => void;
}

export function AttendConferenceSection({ onSelectEnquiryType }: AttendConferenceSectionProps) {
  return (
    <section id="attend-conference" className="bg-[#FFFFFF] py-16 text-[#102C20] sm:py-20 lg:py-24">
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Attend the Conference
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            Gain access to two specialised technical conference halls, the exhibition showcase, and
            executive networking receptions across both event days.
          </p>
        </AnimatedSection>

        {/* Clean Two-Column Editorial Section — No Big Card Shells */}
        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Column 1: Delegate Registration */}
          <AnimatedSection delay={0.05} once className="flex flex-col justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[28px]">
                Delegate Registration
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
                Choose the registration category that fits you. Professional Delegates can register
                and continue to payment; Student Delegates first provide academic evidence for
                review.
              </p>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#2F4439]">
                <p>
                  <strong>Professional Delegate:</strong> Standard conference registration, with
                  payment after you receive your reference.
                </p>
                <p>
                  <strong>Student Delegate:</strong> Academic verification is required before
                  payment. Select Student Delegate on the registration page.
                </p>
              </div>
              <div className="mt-6 space-y-3 text-[15px] text-[#2F4439]">
                <p>• Access to two specialised technical conference tracks</p>
                <p>• Entry to the Innovation Showcase &amp; Exhibition Floor</p>
                <p>• Official delegate documentation, kit and technical proceedings</p>
                <p>• Daily conference luncheon &amp; professional networking receptions</p>
              </div>
            </div>

            <div className="mt-8 pt-6">
              <Link
                to="/registration/delegate"
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028]"
              >
                Choose Delegate Category
              </Link>
              <Link
                to="/registration/continue"
                className="ml-0 mt-4 inline-flex text-[15px] font-bold text-[#102C20] underline underline-offset-4 sm:ml-5 sm:mt-0"
              >
                Continue registration
              </Link>
            </div>
          </AnimatedSection>

          {/* Column 2: Corporate Participation */}
          <AnimatedSection delay={0.1} once className="flex flex-col justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[28px]">
                Corporate Participation
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
                For organisations interested in registering multiple delegates, arranging group
                participation, or consolidated billing.
              </p>
              <div className="mt-6 space-y-3 text-[15px] text-[#2F4439]">
                <p>• Coordinated group registration management for 5+ delegates</p>
                <p>• Consolidated corporate invoicing and billing arrangements</p>
                <p>• Cross-track technical access across asset integrity, AI and cybersecurity</p>
                <p>• Dedicated corporate delegation onboarding and coordination support</p>
              </div>
            </div>

            <div className="mt-8 pt-6">
              <a
                href="#enquiry-form"
                onClick={() => onSelectEnquiryType("Corporate Participation")}
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028]"
              >
                Corporate Participation Enquiry
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
