import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssistantAvatar } from "./AssistantAvatar";

interface AssistantLauncherProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AssistantLauncher({ isOpen, onToggle }: AssistantLauncherProps) {
  const [showNudge, setShowNudge] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    // Check if nudge was shown/dismissed in this browser session
    const dismissed = sessionStorage.getItem("aiaiac_assistant_nudge_dismissed");
    if (!dismissed && !isOpen) {
      setFirstVisit(true);
      const showTimer = setTimeout(() => setShowNudge(true), 2500);
      const autoHideTimer = setTimeout(() => setShowNudge(false), 9500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(autoHideTimer);
      };
    }
    return undefined;
  }, [isOpen]);

  const dismissNudge = () => {
    setShowNudge(false);
    sessionStorage.setItem("aiaiac_assistant_nudge_dismissed", "true");
  };

  const handleLaunchClick = () => {
    dismissNudge();
    onToggle();
  };

  return (
    <div className="fixed bottom-[95px] right-[18px] z-50 flex flex-col items-end sm:bottom-[125px] sm:right-[28px] mb-[env(safe-area-inset-bottom,0px)]">
      {/* First-Visit Session Welcome Nudge Bubble */}
      {showNudge && !isOpen && (
        <div className="mb-3 flex max-w-xs items-center gap-2.5 rounded-2xl border border-[#CBD7CF] bg-[#F7F4EC] px-4 py-2.5 text-xs text-[#092117] shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <AssistantAvatar size="sm" className="shrink-0" />
          <span className="font-sans text-xs leading-snug font-medium text-[#092117]">
            Questions about AIAIAC Africa 2027?
          </span>
          <button
            type="button"
            onClick={dismissNudge}
            aria-label="Dismiss message"
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#092117]/10 text-[#092117]/70 transition-colors hover:bg-[#092117]/20 hover:text-[#092117]"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Main Circular Avatar Assistant Launcher Button */}
      <div className="relative flex items-center">
        {/* Hover / Focus Label Badge */}
        <span className="mr-2 pointer-events-none rounded-lg bg-[#0B2D21] px-3 py-1.5 font-sans text-xs font-semibold tracking-wide text-[#F6F4EC] shadow-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 hidden sm:inline-block">
          {isOpen ? "Close Assistant" : "Ask AIAIAC"}
        </span>

        <button
          type="button"
          onClick={handleLaunchClick}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close AIAIAC Assistant" : "Open AIAIAC Assistant"}
          className={cn(
            "group relative flex size-14 items-center justify-center rounded-full border-2 border-[#214A36] bg-[#061A11] text-white shadow-xl transition-all duration-300 hover:border-[#CFEA3B] hover:scale-105 sm:size-16 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CFEA3B] active:scale-95",
            isOpen && "border-[#CFEA3B] bg-[#0B2D21] ring-2 ring-[#CFEA3B]/30",
          )}
        >
          <AssistantAvatar
            size="lg"
            showPulse={firstVisit && !isOpen}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </button>
      </div>
    </div>
  );
}
