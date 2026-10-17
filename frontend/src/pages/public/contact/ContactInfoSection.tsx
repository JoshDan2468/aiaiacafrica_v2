import { Mail, Phone, MessageSquare } from "lucide-react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { contactDetails } from "@/data/contact";
import { EVENT_CONTACT_CONFIG } from "@/data/eventContactConfig";

export function ContactInfoSection() {
  const whatsappUrl = `https://wa.me/${EVENT_CONTACT_CONFIG.phoneRaw}?text=${encodeURIComponent(
    "Hello AIAIAC Africa team. I would like to make an enquiry about AIAIAC Africa 2027.",
  )}`;

  return (
    <section className="bg-[#F5F2E9] py-14 text-[#102C20] sm:py-16 lg:py-20">
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl">
            Contact Information
          </h2>
        </AnimatedSection>

        {/* Clean 3-Column Layout */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* General Email */}
          <AnimatedSection once className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#173D2D] text-[#CFEA3B]">
              <Mail className="size-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold text-[#4A5D52]">General Email</span>
              <a
                href={`mailto:${contactDetails.email}`}
                className="mt-1 block font-display text-[18px] font-bold text-[#102C20] transition-colors hover:text-[#173D2D] break-all sm:text-[19px]"
              >
                {contactDetails.email}
              </a>
            </div>
          </AnimatedSection>

          {/* Telephone */}
          <AnimatedSection delay={0.06} once className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#173D2D] text-[#CFEA3B]">
              <Phone className="size-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold text-[#4A5D52]">Telephone</span>
              <a
                href={`tel:${contactDetails.phoneHref}`}
                className="mt-1 block font-display text-[18px] font-bold text-[#102C20] transition-colors hover:text-[#173D2D] sm:text-[19px]"
              >
                {contactDetails.phone}
              </a>
            </div>
          </AnimatedSection>

          {/* WhatsApp */}
          <AnimatedSection delay={0.12} once className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#173D2D] text-[#CFEA3B]">
              <MessageSquare className="size-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold text-[#4A5D52]">WhatsApp</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block font-display text-[18px] font-bold text-[#102C20] transition-colors hover:text-[#173D2D] sm:text-[19px]"
              >
                Contact the Event Team
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
