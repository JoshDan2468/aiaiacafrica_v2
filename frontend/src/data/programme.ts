import type { ProgrammeDay } from "@/types";
import { conference } from "./conference";

/**
 * The official AIAC West Africa source material publishes the two conference
 * streams and the dates, but not a session-by-session agenda. Every session
 * below is flagged `placeholder: true` and is safe to replace once the final
 * programme is released — the shape matches what an API will return.
 */
export const programme: ProgrammeDay[] = [
  {
    id: "day-1",
    date: "09 June 2026",
    label: "Day One",
    summary:
      "Opening ceremony, keynote addresses and the first full day of parallel technical sessions across both conference halls.",
    sessions: [
      {
        time: "08:00",
        title: "Registration & networking coffee",
        hall: "Exhibition Hall",
        placeholder: true,
      },
      {
        time: "09:00",
        title: "Opening ceremony & welcome address",
        hall: "Plenary",
        placeholder: true,
      },
      {
        time: "09:30",
        title: "Keynote address",
        detail: "Dr. Kola Fagbayi — Ex-Vice President, British Petroleum",
        hall: "Plenary",
      },
      {
        time: "10:15",
        title: "Keynote address",
        detail:
          "Engr. Audu Ibrahim, FNSE — Managing Director, NNPC Gas Infrastructure Company Limited",
        hall: "Plenary",
      },
      {
        time: "11:00",
        title: "Technical sessions — Asset Integrity & Corrosion",
        hall: conference.conferences[0].hall,
        placeholder: true,
      },
      {
        time: "11:00",
        title: "Technical sessions — Automation & Cybersecurity",
        hall: conference.conferences[1].hall,
        placeholder: true,
      },
      {
        time: "13:00",
        title: "Networking lunch & exhibition tour",
        hall: "Exhibition Hall",
        placeholder: true,
      },
      {
        time: "14:00",
        title: "Panel discussion & case studies",
        hall: "Both halls",
        placeholder: true,
      },
      { time: "17:00", title: "Close of day one", hall: "Plenary", placeholder: true },
    ],
  },
  {
    id: "day-2",
    date: "10 June 2026",
    label: "Day Two",
    summary:
      "Deep-dive technical presentations, regulatory perspectives and the closing roundtable on resilient energy operations.",
    sessions: [
      {
        time: "08:30",
        title: "Registration & networking coffee",
        hall: "Exhibition Hall",
        placeholder: true,
      },
      {
        time: "09:00",
        title: "Technical sessions — Asset Integrity & Corrosion",
        hall: conference.conferences[0].hall,
        placeholder: true,
      },
      {
        time: "09:00",
        title: "Technical sessions — Automation & Cybersecurity",
        hall: conference.conferences[1].hall,
        placeholder: true,
      },
      {
        time: "11:30",
        title: "Regulatory & standards perspectives",
        hall: "Plenary",
        placeholder: true,
      },
      {
        time: "13:00",
        title: "Networking lunch & exhibition tour",
        hall: "Exhibition Hall",
        placeholder: true,
      },
      {
        time: "14:00",
        title: "Technical presentations & solution showcases",
        hall: "Both halls",
        placeholder: true,
      },
      { time: "16:00", title: "Closing roundtable & awards", hall: "Plenary", placeholder: true },
      { time: "17:00", title: "Close of conference", hall: "Plenary", placeholder: true },
    ],
  },
];
