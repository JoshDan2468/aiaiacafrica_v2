import { MessageCircle } from "lucide-react";
import { conference } from "@/data/conference";

export function WhatsAppButton() {
  const phoneClean = conference.contact.phone.replace(/[^0-9]/g, "");
  const encodedMessage = encodeURIComponent(
    "Hello, I would like to make an enquiry about AIAIAC Africa 2027.",
  );
  const whatsappUrl = `https://wa.me/${phoneClean}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact AIAIAC Africa on WhatsApp"
      className="group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex min-h-12 min-w-12 items-center gap-2.5 rounded-full bg-[#25D366] p-3 text-white shadow-lg transition-all duration-300 hover:bg-[#20bd5a] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366] mb-[env(safe-area-inset-bottom,0px)]"
    >
      <MessageCircle className="size-6 shrink-0 fill-current text-white" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap font-sans text-xs font-bold uppercase tracking-[0.08em] opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:pr-1.5 group-hover:opacity-100 group-focus-visible:max-w-xs group-focus-visible:pr-1.5 group-focus-visible:opacity-100">
        Make an enquiry
      </span>
    </a>
  );
}
