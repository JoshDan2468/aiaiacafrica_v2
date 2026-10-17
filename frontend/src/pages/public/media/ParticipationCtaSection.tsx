import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { getWhatsAppEnquiryUrl } from "@/data/eventContactConfig";
import { conference } from "@/data/conference";

export function ParticipationCtaSection() {
  const whatsappUrl = getWhatsAppEnquiryUrl(
    "GENERAL",
    "Hello AIAIAC Africa team. I would like to make a media enquiry regarding AIAIAC Africa 2027.",
  );

  return (
    <section id="enquire" className="bg-[#071C13] py-20 text-[#F7F5EF] sm:py-24 lg:py-28">
      <div className="shell text-center">
        <AnimatedSection once className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-4xl lg:text-[44px]">
            Media Enquiries
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16.5px] leading-relaxed text-[#BCC8C0] sm:text-[17px]">
            Contact the AIAIAC team regarding media participation, press enquiries and event
            information.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact?type=media"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
            >
              <span>Contact the Media Team</span>
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-white/20 bg-[#173D2D] px-8 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            >
              <span>Contact the Team on WhatsApp</span>
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-[#A8B8AE]">
            <span>Media Desk: {conference.contact.phone}</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span>Email: {conference.contact.email}</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
