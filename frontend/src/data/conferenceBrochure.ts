export interface ConferenceBrochureAsset {
  readonly url: string;
  readonly filename: string;
}

const approvedFiles = import.meta.glob<string>(
  "../assets/brochures/aiaiac-2027-conference-brochure.pdf",
  { query: "?url&no-inline", import: "default", eager: true },
);
const approvedUrl = Object.values(approvedFiles)[0];

export const conferenceBrochure: ConferenceBrochureAsset | null = approvedUrl
  ? { url: approvedUrl, filename: "aiaiac-2027-conference-brochure.pdf" }
  : null;

export function isSameOriginBrochure(asset: ConferenceBrochureAsset): boolean {
  try {
    const url = new URL(asset.url, window.location.origin);
    return url.origin === window.location.origin && ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
