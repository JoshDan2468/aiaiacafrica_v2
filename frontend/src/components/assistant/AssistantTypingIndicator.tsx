import { AssistantAvatar } from "./AssistantAvatar";

export function AssistantTypingIndicator() {
  return (
    <div className="mb-3 flex items-start gap-2.5 animate-in fade-in duration-200">
      <AssistantAvatar size="sm" className="mt-1 shrink-0" />
      <div className="flex items-center gap-1.5 rounded-2xl border border-[#CBD7CF] bg-[#EAF0E8] px-4 py-3 text-[#163F2E] shadow-xs">
        <span className="size-1.5 animate-bounce rounded-full bg-[#163F2E] [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[#163F2E] [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[#163F2E]" />
        <span className="ml-1.5 font-sans text-xs font-medium text-[#163F2E]/75">
          AIAIAC Assistant is typing...
        </span>
      </div>
    </div>
  );
}
