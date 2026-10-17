import { useState } from "react";
import { cn } from "@/lib/utils";
import { organisations, resolveOrganisationKey, getOrganisationLogo } from "@/data/organisations";

interface CompanyLogoBadgeProps {
  organisationKey?: string | undefined;
  organisationName?: string | undefined;
  logoUrl?: string | undefined;
  aspect?: "square" | "wide" | undefined;
  className?: string | undefined;
}

const WIDE_LOGO_KEYS = new Set([
  "agip",
  "aie",
  "alpha-echo-energy",
  "anoh",
  "agpc",
  "aramco",
  "arridex",
  "bg-technical",
  "bp",
  "candid-oil",
  "cenosco",
  "cesra",
  "dangote",
  "exxonmobil",
  "fertiglobe",
  "ghana-gas",
  "gexperts",
  "hitachi",
  "meritech",
  "nnpc",
  "orashi",
  "renaissance",
  "seplat",
  "spe",
  "totalenergies",
  "uum",
]);

export function CompanyLogoBadge({
  organisationKey,
  organisationName,
  logoUrl,
  aspect,
  className,
}: CompanyLogoBadgeProps) {
  const [loadError, setLoadError] = useState(false);

  const resolvedKey = resolveOrganisationKey(organisationKey || organisationName);
  const org = resolvedKey ? organisations[resolvedKey] : undefined;
  const resolvedLogo =
    logoUrl ||
    org?.logo ||
    (resolvedKey ? getOrganisationLogo(resolvedKey) : undefined) ||
    undefined;

  if (!resolvedLogo || loadError) {
    // If no verified logo exists, render nothing as a badge to avoid fake acronyms
    return null;
  }

  const isWide =
    aspect === "wide" || org?.aspect === "wide" || (resolvedKey && WIDE_LOGO_KEYS.has(resolvedKey));

  const displayName = org?.shortName || org?.name || organisationName || "Organisation";

  if (isWide) {
    // Aspect-aware wide wordmark badge: 60-76px wide, 30-36px high, subtle neutral border, #FAF8F2
    return (
      <div
        className={cn(
          "flex h-[30px] sm:h-[34px] lg:h-[36px] w-[60px] sm:w-[68px] lg:w-[74px] shrink-0 items-center justify-center rounded-[10px] border border-[#DDE6DE] bg-[#FAF8F2] px-1.5 py-0.5 shadow-xs transition-transform duration-300 hover:scale-105",
          className,
        )}
        title={displayName}
        aria-label={`Logo of ${displayName}`}
      >
        <img
          src={resolvedLogo}
          alt={`Logo of ${displayName}`}
          width={74}
          height={36}
          loading="lazy"
          decoding="async"
          onError={() => setLoadError(true)}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  // Aspect-aware square / icon badge: 36-40px circular, subtle neutral border, #FAF8F2, object-contain
  return (
    <div
      className={cn(
        "flex size-[36px] sm:size-[38px] lg:size-[40px] shrink-0 items-center justify-center rounded-full border border-[#DDE6DE] bg-[#FAF8F2] p-1 shadow-xs transition-transform duration-300 hover:scale-105",
        className,
      )}
      title={displayName}
      aria-label={`Logo of ${displayName}`}
    >
      <img
        src={resolvedLogo}
        alt={`Logo of ${displayName}`}
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        onError={() => setLoadError(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
