import { initialQuickReplies } from "@/data/conferenceAssistant";

export function QuickReplies({
  onSelectTopic,
}: {
  onSelectTopic: (topicId: string, label: string) => void;
}) {
  return (
    <div className="my-3 flex flex-wrap gap-2" aria-label="Suggested quick actions">
      {initialQuickReplies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => onSelectTopic(reply.topicId, reply.label)}
          className="flex min-h-9 items-center justify-center rounded-xl border border-[#CBD7CF] bg-white px-3.5 py-2 text-xs font-semibold text-[#163F2E] shadow-xs transition-all duration-200 hover:border-[#CFEA3B] hover:bg-[#CFEA3B] hover:text-[#092117] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163F2E] active:scale-95"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
