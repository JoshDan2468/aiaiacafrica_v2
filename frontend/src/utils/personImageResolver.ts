import { personImageManifest } from "@/generated/personImageManifest";
import { normalizePersonName } from "@/utils/normalizePersonName";

export interface ResolvePersonImageOptions {
  section:
    | "advisory-board"
    | "organising-committee"
    | "asset-integrity"
    | "artificial-intelligence"
    | "automation-cybersecurity"
    | "speakers"
    | string;
  personName: string;
  personSlug?: string | undefined;
  defaultImage?: string | undefined;
}

/**
 * Global Person Image Resolver
 * Resolves verified image paths strictly by section + normalized person name/slug.
 * Returns exact disk path if matched, or undefined/defaultImage if missing or unconfirmed.
 * Never maps images by array index. Never returns another person's portrait.
 */
export function getPersonImage({
  section,
  personName,
  personSlug,
  defaultImage,
}: ResolvePersonImageOptions): string | undefined {
  if (!section) return defaultImage;

  const sectionManifest = personImageManifest[section];
  if (!sectionManifest) return defaultImage;

  const slug = personSlug || normalizePersonName(personName);

  // 1. Try normalized slug lookup
  if (slug && sectionManifest[slug]) {
    return sectionManifest[slug];
  }

  // 2. Try raw display name lookup
  if (personName && sectionManifest[personName]) {
    return sectionManifest[personName];
  }

  return defaultImage;
}
