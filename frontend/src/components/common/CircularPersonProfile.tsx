import { useState } from "react";
import { CountryBadge } from "@/components/common/CountryFlag";
import { CompanyLogoBadge } from "@/components/common/CompanyLogoBadge";
import { resolveOrganisationKey, getOrganisationLogo } from "@/data/organisations";
import { cn } from "@/lib/utils";

export interface CircularPersonProfileProps {
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  image?: string | undefined;
  countryCode?: string | undefined;
  organisationLogo?: string | undefined;
  companyLogoKey?: string | undefined;
  className?: string | undefined;
  clone?: boolean | undefined;
  variant?: "default" | "compact" | "featured" | string | undefined;
  tone?: "light" | "dark" | undefined;
  size?: "keynote" | "featured" | "directory" | "standard" | "compact" | undefined;
  onClick?: (() => void) | undefined;
  showDetails?: boolean | undefined;
  showOrganisationLogo?: boolean | undefined;
}

function getInitials(name: string): string {
  const cleaned = name
    .replace(/\b(Engr\.|Dr\.|Prof\.|Architect|Sir|\(Engr\.\)|Dr\)\.?)\b/gi, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return "TC";
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  const fChar = first[0] ?? "";
  const lChar = last[0] ?? "";
  return (fChar + lChar).toUpperCase() || "TC";
}

export function CircularPersonProfile({
  name,
  role,
  organisation,
  organisationKey,
  image,
  countryCode,
  organisationLogo,
  companyLogoKey,
  className,
  clone = false,
  variant: _variant = "default",
  tone = "dark",
  size = "standard",
  onClick,
  showDetails = true,
  showOrganisationLogo = true,
}: CircularPersonProfileProps) {
  const [imageError, setImageError] = useState(false);

  const initials = getInitials(name);
  const resolvedKey = organisationKey || companyLogoKey || resolveOrganisationKey(organisation);
  const resolvedLogoUrl =
    organisationLogo || (resolvedKey ? getOrganisationLogo(resolvedKey) : undefined);
  const hasValidImage = Boolean(image && !imageError);
  const isLight = tone === "light";

  const sizeClasses =
    size === "keynote"
      ? "size-60 sm:size-72 lg:size-[300px]"
      : size === "featured"
        ? "size-[160px] sm:size-[175px] lg:size-[185px]"
        : size === "directory"
          ? "size-[140px] sm:size-[150px] lg:size-[160px]"
          : size === "compact"
            ? "size-24 sm:size-28 lg:size-30"
            : "size-32 sm:size-36 lg:size-40";

  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-hidden={clone ? "true" : undefined}
      className={cn(
        "group relative flex w-full shrink-0 flex-col items-center text-center opacity-100 transition-all duration-300",
        size === "featured"
          ? "max-w-[240px] sm:max-w-[260px]"
          : size === "directory"
            ? "max-w-[215px] sm:max-w-[235px]"
            : "max-w-[220px]",
        onClick &&
          "cursor-pointer rounded-2xl p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#214A36] focus-visible:ring-offset-2",
        className,
      )}
    >
      {/* 1. Circular Portrait with Restrained Frame */}
      <div className={cn("relative mx-auto shrink-0", sizeClasses)}>
        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-full border-2 shadow-xs transition-transform duration-300 group-hover:-translate-y-1",
            isLight
              ? "border-[#DDE6DE] bg-[#FAF8F2] group-hover:border-[#214A36]/40"
              : "border-[#173D2D] bg-[#071C13] group-hover:border-[#CADB7E]/40",
          )}
        >
          {hasValidImage ? (
            <img
              src={image}
              alt={`Portrait of ${name}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E5EBE5] to-[#D5E0D5] text-center">
              <span className="font-mono text-sm font-bold tracking-wider text-[#061A11]/60">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* 2. Country Badge (Lower Left ~7 o'clock) */}
        {countryCode && (
          <div className="absolute -bottom-1 -left-1 z-20 transition-transform duration-300 group-hover:scale-105 drop-shadow-xs">
            <CountryBadge code={countryCode} />
          </div>
        )}

        {/* 3. Company Logo Badge (Lower Right ~4 o'clock, Aspect-Aware) */}
        {showOrganisationLogo && (resolvedKey || resolvedLogoUrl) && (
          <div className="absolute -bottom-1 -right-1 z-20 transition-transform duration-300 group-hover:scale-105 drop-shadow-xs">
            <CompanyLogoBadge
              organisationKey={resolvedKey}
              organisationName={organisation}
              logoUrl={resolvedLogoUrl}
            />
          </div>
        )}
      </div>

      {/* 4. Name, Role & Organisation Typography */}
      {showDetails && (
        <div className="mt-4 flex w-full flex-col items-center px-1">
          <h3
            className={cn(
              "font-display font-bold leading-[1.28] tracking-tight text-balance line-clamp-2",
              size === "featured"
                ? "text-[18px] sm:text-[19px] lg:text-[20px]"
                : size === "directory"
                  ? "text-[16px] sm:text-[17px] lg:text-[18px]"
                  : size === "keynote"
                    ? "text-2xl sm:text-3xl"
                    : "text-base sm:text-lg",
              isLight ? "text-[#102C20] opacity-100" : "text-[#FAF8F2] opacity-100",
            )}
          >
            {name}
          </h3>

          <p
            className={cn(
              "mt-1.5 leading-[1.38] text-balance line-clamp-2",
              size === "featured"
                ? "text-[14px] sm:text-[15px] font-medium"
                : "text-[13px] sm:text-[14px] font-medium",
              isLight ? "text-[#3D4E44] opacity-100" : "text-[#DDE6DE]/90 opacity-100",
            )}
          >
            {role}
          </p>

          <p
            className={cn(
              "mt-1 leading-normal text-balance line-clamp-2",
              size === "featured"
                ? "text-[13.5px] sm:text-[14px] font-semibold"
                : "text-[13px] sm:text-[13.5px] font-semibold",
              isLight ? "text-[#173D2D] opacity-100" : "text-[#CADB7E] opacity-100",
            )}
          >
            {organisation}
          </p>
        </div>
      )}
    </Component>
  );
}
