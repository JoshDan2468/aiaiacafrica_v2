import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

export function AssistantInput({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-[#CBD7CF] bg-[#F7F4EC] p-3"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your question..."
        aria-label="Type your question for AIAIAC Assistant"
        className="min-h-11 flex-1 rounded-xl border border-[#CBD7CF] bg-white px-3.5 text-xs text-[#092117] outline-none transition-colors placeholder:text-[#092117]/50 focus:border-[#163F2E] focus:ring-1 focus:ring-[#163F2E]"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label="Send message"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#0B2D21] text-[#CFEA3B] shadow-xs transition-all duration-200 hover:bg-[#163F2E] disabled:opacity-40 disabled:hover:bg-[#0B2D21] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2D21]"
      >
        <Send className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </form>
  );
}
