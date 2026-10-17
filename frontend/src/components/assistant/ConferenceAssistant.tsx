import { useCallback, useEffect, useRef, useState } from "react";
import { resolveAssistantMessage, topicResponses } from "@/data/conferenceAssistant";
import { AssistantLauncher } from "./AssistantLauncher";
import { AssistantPanel } from "./AssistantPanel";
import type { ChatMessage } from "./AssistantMessage";

function formatTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConferenceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const hasInitializedRef = useRef(false);

  // Conversational Greeting Sequence Player
  const playInitialGreeting = useCallback(() => {
    setMessages([]);
    setIsTyping(true);
    setShowQuickReplies(false);

    // Step 1: "Hello 👋"
    const timer1 = setTimeout(() => {
      setMessages([
        {
          id: `greet-1-${Date.now()}`,
          sender: "bot",
          text: "Hello 👋",
          timestamp: formatTimestamp(),
        },
      ]);
      setIsTyping(true);
    }, 300);

    // Step 2: "Welcome to AIAIAC Africa 2027."
    const timer2 = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `greet-2-${Date.now()}`,
          sender: "bot",
          text: "Welcome to AIAIAC Africa 2027.",
          timestamp: formatTimestamp(),
        },
      ]);
      setIsTyping(true);
    }, 1100);

    // Step 3: "How can we help you today?" + Quick Action Chips
    const timer3 = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `greet-3-${Date.now()}`,
          sender: "bot",
          text: "How can we help you today?",
          timestamp: formatTimestamp(),
        },
      ]);
      setIsTyping(false);
      setShowQuickReplies(true);
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Play greeting when panel is opened for the first time
  const handleToggle = () => {
    setIsOpen((prev) => {
      const nextState = !prev;
      if (nextState && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        playInitialGreeting();
      }
      return nextState;
    });
  };

  const handleSelectTopic = (topicId: string, label?: string) => {
    const now = formatTimestamp();

    if (topicId === "initial-options") {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: label || "Back to Options",
          timestamp: now,
        },
      ]);
      setIsTyping(true);
      setShowQuickReplies(false);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: "How else can we help you with AIAIAC Africa 2027?",
            timestamp: formatTimestamp(),
          },
        ]);
        setIsTyping(false);
        setShowQuickReplies(true);
      }, 500);
      return;
    }

    const topicResp = topicResponses[topicId] ?? topicResponses["unmatched"]!;

    // 1. Add Visitor User Message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: label || topicResp.title,
        timestamp: now,
      },
    ]);

    setIsTyping(true);
    setShowQuickReplies(false);

    // 2. Add Assistant Response after typing delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: topicResp.text,
          secondaryText: topicResp.secondaryText,
          topicResponse: topicResp,
          timestamp: formatTimestamp(),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSendMessage = (text: string) => {
    const now = formatTimestamp();
    const topicResp = resolveAssistantMessage(text);

    // 1. Add Visitor User Message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: now,
      },
    ]);

    setIsTyping(true);
    setShowQuickReplies(false);

    // 2. Add Assistant Response after typing delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: topicResp.text,
          secondaryText: topicResp.secondaryText,
          topicResponse: topicResp,
          timestamp: formatTimestamp(),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const handleResetSession = () => {
    playInitialGreeting();
  };

  return (
    <>
      <AssistantLauncher isOpen={isOpen} onToggle={handleToggle} />
      {isOpen && (
        <AssistantPanel
          messages={messages}
          isTyping={isTyping}
          showQuickReplies={showQuickReplies}
          onClose={() => setIsOpen(false)}
          onSelectTopic={handleSelectTopic}
          onSendMessage={handleSendMessage}
          onResetSession={handleResetSession}
        />
      )}
    </>
  );
}
