/**
 * Central Conference Statistics Configuration for AIAIAC Africa 2027.
 *
 * Rules:
 * 1. Only statistics with `confirmed: true` are displayed on public pages.
 * 2. Unconfirmed estimates are kept disabled (`confirmed: false`) to avoid publishing unapproved numbers.
 * 3. Never invent what arbitrary numbers represent.
 */

export interface EventStatisticItem {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  confirmed: boolean;
}

export const eventStats: readonly EventStatisticItem[] = [
  {
    id: "speakers",
    label: "Speakers & Technical Authorities",
    value: 25,
    suffix: "+",
    confirmed: true,
  },
  {
    id: "conferences",
    label: "Specialised Conferences",
    value: 4,
    suffix: "",
    confirmed: true,
  },
  {
    id: "days",
    label: "Days of Strategic Deliberation",
    value: 2,
    suffix: "",
    confirmed: true,
  },
  {
    id: "delegates",
    label: "Executive & Technical Delegates",
    value: 500,
    suffix: "+",
    confirmed: false, // Disabled pending organiser confirmation
  },
  {
    id: "countries",
    label: "Regional & International Countries",
    value: 12,
    suffix: "+",
    confirmed: false, // Disabled pending organiser confirmation
  },
  {
    id: "exhibitors",
    label: "Industrial Technology Exhibitors",
    value: 30,
    suffix: "+",
    confirmed: false, // Disabled pending organiser confirmation
  },
];

/** Returns only verified, organiser-approved statistics for public display */
export const activeEventStats = eventStats.filter((stat) => stat.confirmed);
