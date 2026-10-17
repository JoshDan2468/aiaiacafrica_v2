import { conference } from "./conference";

export interface ActiveEventConfig {
  name: string;
  edition: number;
  status: "scheduled" | "registration-open" | "registration-closed";
  dates: string | null;
  venue: string | null;
  duration: string | null;
  programmeStatus: "being-confirmed" | "published";
  registrationStatus: "being-confirmed" | "open" | "closed";
}

/**
 * Public active-event copy derives the confirmed schedule from conference.ts.
 */
export const activeEvent: ActiveEventConfig = {
  name: "AIAIAC Africa",
  edition: 2027,
  status: "scheduled",
  dates: conference.dates,
  venue: conference.venue,
  duration: conference.dates,
  programmeStatus: "being-confirmed",
  registrationStatus: "being-confirmed",
};

export const activeEventNotice = `${conference.dates} · ${conference.venue}`;

export const previousEdition = {
  label: "Previous edition · 2026 archive",
  year: 2026,
} as const;
