/**
 * Central registry for organisation / company logos (Legacy adapter).
 * Re-exports from @/data/organisations for backwards compatibility.
 */

import { organisations, getOrganisationLogo as getLogo } from "@/data/organisations";

export const organisationLogos: Record<string, string> = Object.entries(organisations).reduce<
  Record<string, string>
>((acc, [key, org]) => {
  if (org.logo) {
    acc[key] = org.logo;
    acc[org.name.toLowerCase()] = org.logo;
    if (org.shortName) {
      acc[org.shortName.toLowerCase()] = org.logo;
    }
  }
  return acc;
}, {});

export function getOrganisationLogo(organisation: string): string | undefined {
  return getLogo(organisation);
}
