import { Link } from "react-router-dom";
import type { AssistantTopicResponse } from "@/data/conferenceAssistant";
import { AssistantAvatar } from "./AssistantAvatar";
import { WhatsAppHandoff } from "./WhatsAppHandoff";

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  secondaryText?: string | undefined;
  topicResponse?: AssistantTopicResponse | undefined;
  timestamp: string;
  showAvatar?: boolean | undefined;
}

export function AssistantMessage({
  message,
  onSelectTopic,
  onClosePanel,
}: {
  message: ChatMessage;
  onSelectTopic?: ((topicId: string, label?: string) => void) | undefined;
  onClosePanel?: (() => void) | undefined;
}) {
  const isBot = message.sender === "bot";
  const resp = message.topicResponse;
  const showAvatar = isBot && (message.showAvatar ?? true);

  return (
    <div className={`mb-3 flex w-full gap-2.5 ${isBot ? "items-start" : "items-end justify-end"}`}>
      {/* Assistant Avatar for Bot Messages */}
      {isBot && (
        <div className="w-7 shrink-0">
          {showAvatar ? (
            <AssistantAvatar size="sm" className="mt-1" />
          ) : (
            <div className="size-7" aria-hidden="true" />
          )}
        </div>
      )}

      <div className={`flex max-w-[84%] flex-col ${isBot ? "items-start" : "items-end"}`}>
        {/* Message Bubble Container */}
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
            isBot
              ? "border border-[#CBD7CF] bg-[#EAF0E8] text-[#092117] shadow-xs"
              : "bg-[#163F2E] font-medium text-white shadow-xs"
          }`}
        >
          {/* Main Text */}
          <p className="whitespace-pre-line">{message.text}</p>

          {/* Secondary Text */}
          {message.secondaryText && (
            <p className="mt-2.5 whitespace-pre-line border-t border-[#CBD7CF]/60 pt-2 text-[#092117]/90">
              {message.secondaryText}
            </p>
          )}

          {/* Bullet Points */}
          {resp?.bulletPoints && resp.bulletPoints.length > 0 && (
            <ul className="mt-2.5 space-y-1.5 border-t border-[#CBD7CF]/60 pt-2.5">
              {resp.bulletPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#092117]/90">
                  <span className="text-[#092117] font-bold" aria-hidden>
                    •
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Response Action Buttons / Chips */}
          {resp?.actions && resp.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#CBD7CF]/60 pt-2.5">
              {resp.actions.map((act, idx) => {
                if (act.type === "route" && act.target) {
                  return (
                    <Link
                      key={idx}
                      to={act.target}
                      onClick={onClosePanel}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#B8C9BE] bg-white px-3 py-1.5 text-xs font-semibold text-[#163F2E] shadow-xs transition-colors hover:bg-[#CFEA3B] hover:text-[#092117] hover:border-[#CFEA3B]"
                    >
                      {act.label}
                    </Link>
                  );
                }

                if (act.type === "whatsapp") {
                  return (
                    <WhatsAppHandoff
                      key={idx}
                      topicId={act.topicId}
                      label={act.label}
                      className="w-full mt-1"
                    />
                  );
                }

                if (act.type === "topic" && act.topicId && onSelectTopic) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectTopic(act.topicId!, act.label)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#B8C9BE] bg-white px-3 py-1.5 text-xs font-semibold text-[#163F2E] shadow-xs transition-colors hover:bg-[#CFEA3B] hover:text-[#092117] hover:border-[#CFEA3B]"
                    >
                      {act.label}
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="mt-1 px-1 font-mono text-[0.6rem] text-[#092117]/50">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}
