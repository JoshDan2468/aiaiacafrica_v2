import { conference } from "./conference";

export interface SocialLinkItem {
  platform: string;
  label: string;
  url: string;
}

export const activeSocialLinks: readonly SocialLinkItem[] = conference.socialMedia
  .filter((item) => typeof item.url === "string" && item.url.trim().length > 0)
  .map((item) => ({
    platform: item.platform,
    label: `AIAIAC Africa on ${item.platform}`,
    url: item.url.trim(),
  }));
