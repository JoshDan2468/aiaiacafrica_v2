import { useState } from "react";
import { cn } from "@/lib/utils";

interface AssistantAvatarProps {
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
  showPulse?: boolean | undefined;
}

const AVATAR_PRIMARY_SRC = "/assets/aiaiac-2027/assistant/aiaiac-assistant.webp";
const AVATAR_SECONDARY_SRC = "/assets/aiaiac-2027/assistant/receptionist-avatar.webp";

export function AssistantAvatar({
  size = "md",
  className,
  showPulse = false,
}: AssistantAvatarProps) {
  const [imgStage, setImgStage] = useState<"primary" | "secondary" | "fallback">("primary");

  const sizeClasses = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-xs",
    lg: "size-14 sm:size-16 text-sm",
  };

  const badgeSizeClasses = {
    sm: "size-2 right-0 bottom-0",
    md: "size-2.5 right-0.5 bottom-0.5",
    lg: "size-3.5 right-1 bottom-1",
  };

  const handleImageError = () => {
    if (imgStage === "primary") {
      setImgStage("secondary");
    } else {
      setImgStage("fallback");
    }
  };

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      {/* Outer Pulse Glow (for launcher on first visit) */}
      {showPulse && (
        <span className="absolute -inset-1 animate-ping rounded-full bg-[#CFEA3B]/25 opacity-75 duration-1000" />
      )}

      {/* Main Circular Avatar Container */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full border-2 border-[#214A36] bg-[#061A11] shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:border-[#CFEA3B]",
          sizeClasses[size],
        )}
      >
        {imgStage === "primary" ? (
          <img
            src={AVATAR_PRIMARY_SRC}
            alt="AIAIAC Conference Concierge Receptionist Avatar"
            onError={handleImageError}
            className="size-full object-cover"
          />
        ) : imgStage === "secondary" ? (
          <img
            src={AVATAR_SECONDARY_SRC}
            alt="AIAIAC Conference Concierge Avatar"
            onError={handleImageError}
            className="size-full object-cover"
          />
        ) : (
          /* Elegant Professional Female Receptionist / Concierge Vector SVG Fallback */
          <svg
            viewBox="0 0 100 100"
            className="size-full bg-gradient-to-b from-[#0C3527] via-[#072218] to-[#04130D] p-0.5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Soft Ambient Radial Background Glow */}
            <circle cx="50" cy="50" r="46" fill="url(#receptionist-glow)" opacity="0.3" />

            {/* Hair Bun / Updo (Back Layer) */}
            <circle cx="50" cy="24" r="13" fill="#241B17" />

            {/* Shoulders & Executive Blazer Silhouette (#0F3D2C dark forest green suit) */}
            <path d="M18 92 C18 68, 32 63, 50 63 C68 63, 82 68, 82 92 Z" fill="#0F3D2C" />

            {/* Crisp White Blouse V-Neck */}
            <polygon points="42,63 58,63 50,78" fill="#FFFFFF" />

            {/* Executive Blazer Lapels (#072417) */}
            <path d="M28 64 L44 76 L40 92 L20 92 Z" fill="#072417" />
            <path d="M72 64 L56 76 L60 92 L80 92 Z" fill="#072417" />

            {/* AIAIAC Lime Concierge Badge / Lapel Pin */}
            <rect x="33" y="74" width="6" height="8" rx="1.5" fill="#A3E635" />

            {/* Neck */}
            <rect x="44" y="48" width="12" height="18" fill="#F7D8C8" />

            {/* Head / Face Oval */}
            <ellipse cx="50" cy="40" rx="15" ry="18" fill="#F7D8C8" />

            {/* Professional Female Hair / Styled Updo Hairline */}
            <path
              d="M35 38 C34 26, 43 21, 50 21 C57 21, 66 26, 65 38 C60 30, 52 28, 35 38 Z"
              fill="#241B17"
            />
            {/* Side Hair Framing */}
            <path d="M35 34 C33 42, 35 48, 37 52 C39 46, 38 38, 35 34 Z" fill="#241B17" />
            <path d="M65 34 C67 42, 65 48, 63 52 C61 46, 62 38, 65 34 Z" fill="#241B17" />

            {/* Subtle Eye Contours & Warm Welcoming Smile */}
            <path
              d="M43 40 Q46 38, 48 40"
              stroke="#5C4033"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M52 40 Q54 38, 57 40"
              stroke="#5C4033"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M46 48 Q50 52, 54 48"
              stroke="#A85D48"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />

            <defs>
              <radialGradient id="receptionist-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A3E635" />
                <stop offset="100%" stopColor="#05190F" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Online Status Indicator Badge */}
      <span
        className={cn(
          "absolute rounded-full border-2 border-[#05190F] bg-emerald-400 shadow-xs",
          badgeSizeClasses[size],
        )}
        aria-hidden="true"
      />
    </div>
  );
}
