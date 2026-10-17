import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { getWhatsAppEnquiryUrl } from "@/data/eventContactConfig";

export function EnquiryCtaSection() {
  const whatsappUrl = getWhatsAppEnquiryUrl(
    "SPONSORSHIP",
    "Hello AIAIAC Africa team. I would like information about sponsorship opportunities for AIAIAC Africa 2027.",
  );

  return (
    <section id="enquire" className="bg-[#071C13] py-20 text-[#F7F5EF] sm:py-24 lg:py-28">
      <div className="shell text-center">
        <AnimatedSection className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-4xl lg:text-[46px]">
            Discuss Sponsorship Opportunities
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[#BCC8C0] sm:text-lg">
            Contact the AIAIAC commercial team to discuss available sponsorship options and
            partnership opportunities.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/registration/sponsor"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
            >
              <span>Make a Sponsorship Enquiry</span>
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-[rgba(247,245,239,0.28)] bg-transparent px-8 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            >
              <span>Contact the Team on WhatsApp</span>
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-[#A8B8AE]">
            <span>Commercial Desk: +234 701 493 4538</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span>Email: aiaiac@aiac-africa.com</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
