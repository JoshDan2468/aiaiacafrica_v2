import { useState } from "react";
import { CountryFlag } from "@/components/common/CountryFlag";
import { getOrganisationLogo } from "@/data/organisations";
import { cn } from "@/lib/utils";

export interface PersonMetaProps {
  countryCode?: string | undefined;
  countryName?: string | undefined;
  companyLogoKey?: string | undefined;
  organisationKey?: string | undefined;
  organisationLogo?: string | undefined;
  organisation: string;
  className?: string | undefined;
}

function getShortOrgInitials(orgName: string): string {
  if (!orgName) return "ORG";
  const cleaned = orgName.replace(/\b(Limited|Ltd|Inc|Company|Corporation|Corp)\b/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0]?.slice(0, 5) ?? "ORG").toUpperCase();
  }
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function PersonMeta({
  countryCode,
  companyLogoKey,
  organisationKey,
  organisationLogo,
  organisation,
  className,
}: PersonMetaProps) {
  const [logoError, setLogoError] = useState(false);

  // Resolve organisation logo
  const resolvedKey = organisationKey || companyLogoKey;
  const logoUrl = organisationLogo || getOrganisationLogo(resolvedKey || organisation) || undefined;
  const shortInitials = getShortOrgInitials(organisation);

  return (
    <div
      className={cn(
        "mt-2.5 flex items-center justify-between gap-2.5 border-t border-white/20 pt-2.5 min-h-[32px] w-full",
        className,
      )}
    >
      {/* LEFT SIDE: Country Flag + Title-Case Country Name */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        {countryCode ? (
          <CountryFlag code={countryCode} />
        ) : (
          <span className="sr-only">{organisation}</span>
        )}
      </div>

      {/* RIGHT SIDE: Company / Organisation Logo or Short Initials Fallback */}
      <div className="flex items-center justify-end shrink-0 ml-auto">
        {logoUrl && !logoError ? (
          <div className="flex h-7 max-w-[80px] items-center justify-center rounded-md bg-white/95 px-2 py-0.5 shadow-xs transition-opacity">
            <img
              src={logoUrl}
              alt=""
              width={75}
              height={26}
              loading="lazy"
              decoding="async"
              onError={() => setLogoError(true)}
              className="max-h-[22px] max-w-[65px] object-contain"
            />
          </div>
        ) : (
          <div className="flex h-6 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[0.65rem] font-bold tracking-wider text-lime/90 shadow-2xs">
            <span>{shortInitials}</span>
          </div>
        )}
      </div>
    </div>
  );
}
