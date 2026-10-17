import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { conference } from "@/data/conference";
import { AIAIAC_WHATSAPP_NUMBER } from "@/data/eventContactConfig";

export function ExhibitionEnquirySection() {
  const whatsappExhibitionMessage = encodeURIComponent(
    "Hello AIAIAC Africa team. I would like information about exhibiting at AIAIAC Africa 2027.",
  );
  const whatsappUrl = `https://wa.me/${AIAIAC_WHATSAPP_NUMBER}?text=${whatsappExhibitionMessage}`;

  return (
    <section
      id="enquiry"
      aria-labelledby="exhibition-enquiry-heading"
      className="bg-[#071C13] py-20 text-[#F7F5EF] lg:py-24"
    >
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="mx-auto max-w-4xl text-center">
          <h2
            id="exhibition-enquiry-heading"
            className="font-display text-4xl font-bold tracking-tight text-[#F7F5EF] sm:text-5xl lg:text-[48px] lg:leading-[1.1]"
          >
            Discuss Exhibition Opportunities
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-relaxed text-[#CAD7CE] sm:text-[17.5px]">
            Contact the AIAIAC team to discuss stand availability and exhibition requirements.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <ActionLink
              to="/registration/exhibitor"
              variant="primary"
              className="h-[52px] rounded-[14px] bg-[#CFEA3B] px-6 text-base font-bold text-[#102C20] shadow-md hover:bg-[#d9f243]"
            >
              Make an Exhibition Enquiry
            </ActionLink>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[#235841] bg-[#173D2D] px-6 text-base font-semibold text-[#F7F5EF] transition-all hover:bg-[#1f4e3a] hover:text-[#CFEA3B] active:translate-y-0.5"
            >
              Contact the Team on WhatsApp
            </a>
          </div>

          {/* Direct Commercial Contacts Strip */}
          <div className="mt-14 border-t border-white/10 pt-10">
            <div className="grid gap-6 text-center sm:grid-cols-3 sm:text-left">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wider text-[#CADB7E]">
                  Commercial Desk Email
                </p>
                <a
                  href={`mailto:${conference.contact.email}`}
                  className="mt-1.5 inline-block text-[16px] font-medium text-[#F7F5EF] underline-offset-4 hover:text-[#CFEA3B] hover:underline"
                >
                  {conference.contact.email}
                </a>
              </div>

              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wider text-[#CADB7E]">
                  Direct Telephone
                </p>
                <a
                  href={`tel:${conference.contact.phone.replace(/\s+/g, "")}`}
                  className="mt-1.5 inline-block text-[16px] font-medium text-[#F7F5EF] underline-offset-4 hover:text-[#CFEA3B] hover:underline"
                >
                  {conference.contact.phone}
                </a>
              </div>

              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wider text-[#CADB7E]">
                  Event Location
                </p>
                <p className="mt-1.5 text-[16px] font-medium text-[#F7F5EF]">{conference.venue}</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
