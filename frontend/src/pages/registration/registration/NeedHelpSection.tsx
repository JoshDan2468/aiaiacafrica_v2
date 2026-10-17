import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { EVENT_CONTACT_CONFIG } from "@/data/eventContactConfig";

export function NeedHelpSection() {
  const whatsappUrl = `https://wa.me/${EVENT_CONTACT_CONFIG.phoneRaw}?text=${encodeURIComponent(
    "Hello AIAIAC Africa team. I would like assistance choosing the right participation option for AIAIAC Africa 2027.",
  )}`;

  return (
    <section
      id="need-help-choosing"
      className="bg-[#05190F] py-16 text-[#F7F5EF] sm:py-20 lg:py-24"
    >
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-4xl">
            Need Help Choosing?
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#BCC8C0] sm:text-[17.5px]">
            If you are unsure which participation option applies to you, contact the AIAIAC team for
            assistance.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[#CFEA3B] px-8 text-[15px] font-semibold text-[#102C20] transition-colors hover:bg-[#bfe028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              <span>Contact the Team on WhatsApp</span>
            </a>
            <Link
              to="/contact"
              className="inline-flex h-[50px] items-center justify-center rounded-[14px] border border-[#214A36] bg-[#0D2C20] px-8 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#173D2D]"
            >
              <span>Contact Event Team</span>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
