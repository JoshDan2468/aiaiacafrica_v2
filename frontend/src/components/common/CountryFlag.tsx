import { cn } from "@/lib/utils";

export interface CountryFlagProps {
  code?: string | undefined;
  className?: string | undefined;
  showLabel?: boolean | undefined;
}

const countryNames: Record<string, string> = {
  NG: "Nigeria",
  TZ: "Tanzania",
  US: "United States",
  USA: "United States",
  CA: "Canada",
  GH: "Ghana",
  NA: "Namibia",
  AE: "UAE",
  UAE: "UAE",
  NL: "Netherlands",
  AO: "Angola",
  MY: "Malaysia",
  SA: "Saudi Arabia",
};

export function getCountryName(code?: string): string {
  if (!code) return "";
  return countryNames[code.toUpperCase()] || code.toUpperCase();
}

export function CountryFlag({ code, className, showLabel = false }: CountryFlagProps) {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  const label = getCountryName(upperCode);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 align-middle select-none", className)}
      title={label}
      aria-label={`Country: ${label}`}
    >
      {renderFlagSvg(upperCode)}
      {showLabel && (
        <span className="text-xs font-semibold tracking-wide uppercase text-current">{label}</span>
      )}
    </span>
  );
}

/**
 * 28-32px Circular Country Badge with subtle warm-ivory surface
 * Harmonizes with CompanyLogoBadge.
 */
export function CountryBadge({
  code,
  className,
}: {
  code?: string | undefined;
  className?: string | undefined;
}) {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  const title = getCountryName(upperCode);

  return (
    <div
      className={cn(
        "flex size-[30px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#F5F1E7] p-1 shadow-xs transition-transform duration-300 hover:scale-105 sm:size-[32px]",
        "flex size-[30px] shrink-0 items-center justify-center rounded-full border border-[#DDE6DE] bg-[#FAF8F2] p-1 shadow-xs transition-transform duration-300 hover:scale-105 sm:size-[32px] lg:size-[34px]",
        className,
      )}
      title={title}
      aria-label={`Country: ${title}`}
    >
      <CountryFlag code={upperCode} />
    </div>
  );
}

function renderFlagSvg(code: string) {
  const commonClasses =
    "h-3.5 w-5 rounded-[2px] border border-black/15 shadow-2xs shrink-0 object-cover";

  switch (code) {
    case "NG":
      // Nigeria: Green - White - Green vertical tricolor
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="8" height="16" fill="#008751" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#008751" />
        </svg>
      );

    case "GH":
      // Ghana: Red - Gold - Green horizontal tricolor with black star
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="5.33" fill="#D21034" />
          <rect y="5.33" width="24" height="5.33" fill="#FFD100" />
          <rect y="10.66" width="24" height="5.34" fill="#006B3F" />
          <polygon
            points="12,6.2 12.8,8.7 15.4,8.7 13.3,10.2 14.1,12.7 12,11.2 9.9,12.7 10.7,10.2 8.6,8.7 11.2,8.7"
            fill="#000000"
          />
        </svg>
      );

    case "TZ":
      // Tanzania: Green, Yellow, Black diagonal, Yellow, Blue
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <polygon points="0,0 24,0 0,16" fill="#1EB53A" />
          <polygon points="0,16 24,0 24,16" fill="#00A3DD" />
          <polygon points="0,16 2,16 24,1.3 24,0 22,0 0,14.7" fill="#FCD116" />
          <polygon points="0,16 5,16 24,3.3 24,0 19,0 0,12.7" fill="#000000" />
        </svg>
      );

    case "US":
    case "USA":
      // USA: Red/White horizontal stripes + Blue canton
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="16" fill="#BB133E" />
          <rect y="2.28" width="24" height="2.28" fill="#FFFFFF" />
          <rect y="6.85" width="24" height="2.28" fill="#FFFFFF" />
          <rect y="11.42" width="24" height="2.28" fill="#FFFFFF" />
          <rect width="10" height="9.14" fill="#002147" />
          <circle cx="2.5" cy="2.5" r="0.6" fill="#FFFFFF" />
          <circle cx="5" cy="2.5" r="0.6" fill="#FFFFFF" />
          <circle cx="7.5" cy="2.5" r="0.6" fill="#FFFFFF" />
          <circle cx="3.75" cy="4.5" r="0.6" fill="#FFFFFF" />
          <circle cx="6.25" cy="4.5" r="0.6" fill="#FFFFFF" />
          <circle cx="2.5" cy="6.5" r="0.6" fill="#FFFFFF" />
          <circle cx="5" cy="6.5" r="0.6" fill="#FFFFFF" />
          <circle cx="7.5" cy="6.5" r="0.6" fill="#FFFFFF" />
        </svg>
      );

    case "CA":
      // Canada: Red - White - Red with central Maple Leaf
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="6" height="16" fill="#FF0000" />
          <rect x="6" width="12" height="16" fill="#FFFFFF" />
          <rect x="18" width="6" height="16" fill="#FF0000" />
          {/* Simplified stylized 11-point maple leaf */}
          <path
            d="M 12 3.5 
               L 12.8 5.8 L 14.5 5.2 L 13.8 6.8 L 15.8 7.2 L 14.8 8.8 L 15.5 9.8 L 13.5 9.8 L 13.8 11.2 
               L 12.3 11 L 12.3 13.2 L 11.7 13.2 L 11.7 11 L 10.2 11.2 L 10.5 9.8 L 8.5 9.8 L 9.2 8.8 
               L 8.2 7.2 L 10.2 6.8 L 9.5 5.2 L 11.2 5.8 Z"
            fill="#FF0000"
          />
        </svg>
      );

    case "NA":
      // Namibia: Blue top, Red diagonal stripe with White borders, Green bottom
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="16" fill="#003580" />
          <polygon points="0,16 24,0 24,16" fill="#009543" />
          <polygon points="0,16 18,0 24,0 0,16" fill="#FFFFFF" />
          <polygon points="0,16 20,0 24,0 0,14" fill="#D21034" />
          <circle cx="5" cy="4.5" r="2" fill="#FFCE00" />
        </svg>
      );

    case "AE":
    case "UAE":
      // UAE: Red hoist bar, Green, White, Black horizontal stripes
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect x="6" width="18" height="5.33" fill="#00732F" />
          <rect x="6" y="5.33" width="18" height="5.33" fill="#FFFFFF" />
          <rect x="6" y="10.66" width="18" height="5.34" fill="#000000" />
          <rect width="6" height="16" fill="#FF0000" />
        </svg>
      );

    case "NL":
      // Netherlands: Red, White, Blue horizontal tricolor
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="5.33" fill="#AE1C28" />
          <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
          <rect y="10.66" width="24" height="5.34" fill="#21468B" />
        </svg>
      );

    case "AO":
      // Angola: Red and Black horizontal halves with yellow central emblem
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="8" fill="#CC092F" />
          <rect y="8" width="24" height="8" fill="#000000" />
          <circle cx="12" cy="8" r="2.5" fill="none" stroke="#FFCC00" strokeWidth="1" />
          <polygon
            points="12,6.5 12.5,7.8 13.8,7.8 12.8,8.5 13.2,9.8 12,9 10.8,9.8 11.2,8.5 10.2,7.8 11.5,7.8"
            fill="#FFCC00"
          />
        </svg>
      );

    case "MY":
      // Malaysia: Red/White stripes with blue canton
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="16" fill="#CC0000" />
          <rect y="2.28" width="24" height="2.28" fill="#FFFFFF" />
          <rect y="6.85" width="24" height="2.28" fill="#FFFFFF" />
          <rect y="11.42" width="24" height="2.28" fill="#FFFFFF" />
          <rect width="12" height="9.14" fill="#000066" />
          <circle cx="5.5" cy="4.5" r="2.2" fill="#FFCC00" />
          <circle cx="6.2" cy="4.5" r="1.8" fill="#000066" />
        </svg>
      );

    case "SA":
      // Saudi Arabia: Green background
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={commonClasses}>
          <rect width="24" height="16" fill="#006C35" />
          <line x1="6" y1="11" x2="18" y2="11" stroke="#FFFFFF" strokeWidth="1" />
          <rect x="7" y="6" width="10" height="3" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
        </svg>
      );

    default:
      // Generic ISO code badge fallback
      return (
        <span className="inline-flex h-3.5 w-5 items-center justify-center rounded-[2px] border border-black/15 bg-black/10 font-mono text-[0.5rem] font-bold uppercase text-black/70">
          {code.slice(0, 2)}
        </span>
      );
  }
}
