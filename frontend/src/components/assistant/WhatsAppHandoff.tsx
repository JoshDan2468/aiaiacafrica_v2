import { MessageCircle } from "lucide-react";
import { getWhatsAppHandoffUrl } from "@/data/conferenceAssistant";
import { cn } from "@/lib/utils";

export function WhatsAppHandoff({
  topicId,
  queryContext,
  label = "Continue on WhatsApp",
  className,
}: {
  topicId?: string | undefined;
  queryContext?: string | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  const whatsappUrl = getWhatsAppHandoffUrl(topicId, queryContext);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Connect with AIAIAC team on WhatsApp"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all duration-300 hover:bg-[#20bd5a] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]",
        className,
      )}
    >
      <MessageCircle className="size-4 shrink-0 fill-current text-white" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
