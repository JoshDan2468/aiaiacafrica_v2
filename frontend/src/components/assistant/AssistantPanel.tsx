import { useEffect, useRef } from "react";
import { Minus, RotateCcw, X } from "lucide-react";
import { AssistantAvatar } from "./AssistantAvatar";
import { AssistantInput } from "./AssistantInput";
import { AssistantMessage, type ChatMessage } from "./AssistantMessage";
import { AssistantTypingIndicator } from "./AssistantTypingIndicator";
import { QuickReplies } from "./QuickReplies";

export function AssistantPanel({
  messages,
  isTyping,
  showQuickReplies,
  onClose,
  onSelectTopic,
  onSendMessage,
  onResetSession,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  showQuickReplies: boolean;
  onClose: () => void;
  onSelectTopic: (topicId: string, label?: string) => void;
  onSendMessage: (text: string) => void;
  onResetSession: () => void;
}) {
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or typing indicator
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showQuickReplies]);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AIAIAC Assistant Panel"
      className="fixed bottom-[95px] right-[18px] z-50 flex h-[84dvh] max-h-[580px] w-[calc(100vw-24px)] max-w-[390px] flex-col overflow-hidden rounded-[20px] border border-[#214A36]/30 bg-[#F7F4EC] shadow-2xl shadow-black/30 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-[125px] sm:right-[28px] sm:h-[550px] mb-[env(safe-area-inset-bottom,0px)]"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#214A36]/20 bg-[#0B2D21] px-4 py-3.5 text-[#F6F4EC]">
        <div className="flex items-center gap-3">
          <AssistantAvatar size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#F6F4EC] sm:text-sm">
                AIAIAC Assistant
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#D4E869]" />
              <p className="font-sans text-[0.68rem] font-medium tracking-wide text-[#B8C6BC]">
                Conference Concierge • <span className="text-[#D4E869]">Here to help</span>
              </p>
            </div>
          </div>
        </div>

        {/* Panel Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResetSession}
            title="Reset conversation"
            aria-label="Reset conversation options"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#B8C6BC] transition-colors hover:border-[#CFEA3B]/40 hover:text-[#CFEA3B] focus-visible:outline-2 focus-visible:outline-[#CFEA3B]"
          >
            <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Minimise assistant"
            aria-label="Minimise AIAIAC Assistant"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#B8C6BC] transition-colors hover:border-[#CFEA3B]/40 hover:text-[#CFEA3B] focus-visible:outline-2 focus-visible:outline-[#CFEA3B]"
          >
            <Minus className="size-4 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close assistant"
            aria-label="Close AIAIAC Assistant panel"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#B8C6BC] transition-colors hover:border-[#CFEA3B]/40 hover:text-[#CFEA3B] focus-visible:outline-2 focus-visible:outline-[#CFEA3B]"
          >
            <X className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Body (Warm Ivory Background) */}
      <div className="flex-1 overflow-y-auto bg-[#F7F4EC] p-4 scrollbar-thin">
        {messages.map((msg, index) => {
          // Calculate if avatar should be shown: show only on first message of a consecutive bot group
          const prevMsg = messages[index - 1];
          const isFirstInBlock = !prevMsg || prevMsg.sender !== msg.sender;
          const messageWithAvatar: ChatMessage = {
            ...msg,
            showAvatar: isFirstInBlock,
          };

          return (
            <AssistantMessage
              key={msg.id}
              message={messageWithAvatar}
              onSelectTopic={onSelectTopic}
              onClosePanel={onClose}
            />
          );
        })}

        {/* Animated Typing Indicator */}
        {isTyping && <AssistantTypingIndicator />}

        {/* Quick Reply Chips (shown at start or after resetting options) */}
        {showQuickReplies && !isTyping && <QuickReplies onSelectTopic={onSelectTopic} />}

        <div ref={messageEndRef} />
      </div>

      {/* Input Bar */}
      <AssistantInput onSend={onSendMessage} />
    </div>
  );
}
