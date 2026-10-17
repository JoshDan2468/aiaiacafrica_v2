import { MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { EVENT_CONTACT_CONFIG } from "@/data/eventContactConfig";

export function WhatsAppSection() {
  const [searchParams] = useSearchParams();
  const paramType = searchParams.get("type")?.toLowerCase();

  let message =
    "Hello AIAIAC Africa team. I would like to make an enquiry about AIAIAC Africa 2027.";
  if (paramType === "sponsor" || paramType === "sponsorship") {
    message =
      "Hello AIAIAC Africa team. I would like information about sponsorship opportunities for AIAIAC Africa 2027.";
  } else if (paramType === "exhibit" || paramType === "exhibition") {
    message =
      "Hello AIAIAC Africa team. I would like information about exhibiting at AIAIAC Africa 2027.";
  } else if (paramType === "delegate") {
    message =
      "Hello AIAIAC Africa team. I would like information about delegate participation for AIAIAC Africa 2027.";
  } else if (paramType === "media") {
    message =
      "Hello AIAIAC Africa team. I would like to make a media enquiry regarding AIAIAC Africa 2027.";
  } else if (paramType === "speaker" || paramType === "abstract") {
    message =
      "Hello AIAIAC Africa team. I would like information about speaker and abstract participation for AIAIAC Africa 2027.";
  }

  const whatsappUrl = `https://wa.me/${EVENT_CONTACT_CONFIG.phoneRaw}?text=${encodeURIComponent(message)}`;

  return (
    <section className="bg-[#EAEFEA] py-14 text-[#102C20] sm:py-16 lg:py-20">
      <div className="shell max-w-[1240px]">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl">
            Contact the Team on WhatsApp
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            For time-sensitive event enquiries, you can contact the AIAIAC team on WhatsApp.
          </p>
          <div className="mt-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[#173D2D] px-8 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              <span>Continue on WhatsApp</span>
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
