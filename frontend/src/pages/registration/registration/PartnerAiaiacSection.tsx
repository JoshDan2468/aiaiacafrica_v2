import { AnimatedSection } from "@/components/common/AnimatedSection";

interface PartnerAiaiacSectionProps {
  onSelectEnquiryType: (type: string) => void;
}

export function PartnerAiaiacSection({ onSelectEnquiryType }: PartnerAiaiacSectionProps) {
  return (
    <section id="partner-aiaiac" className="bg-[#EAEFEA] py-16 text-[#102C20] sm:py-20 lg:py-24">
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Partner with AIAIAC
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Position your organisation as an industry leader through bespoke sponsorship packages
            and targeted exhibition showcases.
          </p>
        </AnimatedSection>

        {/* Two Substantial Editorial Columns — No Generic Cards */}
        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Column 1: Sponsorship */}
          <AnimatedSection delay={0.05} once className="flex flex-col justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[28px]">
                Sponsorship
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
                Explore sponsorship opportunities for organisations seeking brand visibility,
                keynote alignment, and executive networking.
              </p>
              <div className="mt-6 space-y-3 text-[15px] text-[#2F4439]">
                <p>
                  • Strategic brand prominence across digital, print, and onsite conference assets
                </p>
                <p>
                  • Executive networking opportunities with regional energy and infrastructure
                  leaders
                </p>
                <p>
                  • Keynote and plenary stage alignment with asset integrity and digital innovation
                </p>
                <p>• Dedicated corporate delegation passes and VIP banquet participation</p>
              </div>
            </div>

            <div className="mt-8 pt-6">
              <a
                href="#enquiry-form"
                onClick={() => onSelectEnquiryType("Sponsorship")}
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028]"
              >
                Make a Sponsorship Enquiry
              </a>
            </div>
          </AnimatedSection>

          {/* Column 2: Exhibition */}
          <AnimatedSection delay={0.1} once className="flex flex-col justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#102C20] sm:text-[28px]">
                Exhibition
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#3F5347] sm:text-[17px]">
                Enquire about exhibiting products, services and technical solutions directly to
                decision-makers across West Africa.
              </p>
              <div className="mt-6 space-y-3 text-[15px] text-[#2F4439]">
                <p>
                  • Shell scheme and space-only exhibition stands across the main showcase floor
                </p>
                <p>• Available standard configurations: 9 sqm, 18 sqm, 36 sqm, or bespoke space</p>
                <p>• Direct engagement with 1,200+ engineering and operational decision-makers</p>
                <p>
                  • Complimentary exhibitor passes and listing in the official conference directory
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6">
              <a
                href="#enquiry-form"
                onClick={() => onSelectEnquiryType("Exhibition")}
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-bold text-[#102C20] transition-colors hover:bg-[#bfe028]"
              >
                Make an Exhibition Enquiry
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
