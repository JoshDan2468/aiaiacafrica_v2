import type { CommunicationContent } from "../../types/communication";
import {
  aiaiacEmailLayout,
  emailCta,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export const communicationPresets = [
  {
    id: "GENERAL_ANNOUNCEMENT",
    label: "General Announcement",
    heading: "Conference announcement",
    body: "We have an update for the AIAIAC Africa 2027 community.",
  },
  {
    id: "REGISTRATION_REMINDER",
    label: "Registration Reminder",
    heading: "Your conference registration",
    body: "Please review the latest information about AIAIAC Africa 2027 registration.",
  },
  {
    id: "PROGRAMME_UPDATE",
    label: "Programme Update",
    heading: "Programme update",
    body: "Explore the latest AIAIAC Africa 2027 programme news.",
  },
  {
    id: "VENUE_CHECK_IN",
    label: "Venue & Check-in Information",
    heading: "Venue and check-in",
    body: "Here is what to know before arriving at AIAIAC Africa 2027.",
  },
  {
    id: "EVENT_REMINDER",
    label: "Event Reminder",
    heading: "The conference is coming",
    body: "We look forward to welcoming you to AIAIAC Africa 2027.",
  },
] as const;

export function communicationTemplate(
  input: CommunicationContent,
  options: { test?: boolean; unsubscribeUrl?: string | undefined } = {},
): { subject: string; text: string; html: string } {
  const subject = input.subject;
  const body = escapeEmailHtml(input.body).replace(/\r?\n/g, "<br>");
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `${emailCta(input.ctaUrl, input.ctaLabel)}`
      : "";
  const html = aiaiacEmailLayout({
    title: subject,
    preview: input.preheader,
    bodyHtml: `<h1 style="font-size:24px;line-height:1.3">${escapeEmailHtml(input.heading)}</h1><p>${body}</p>${cta}${options.unsubscribeUrl ? `<p style="margin:28px 0 0;font-size:12px;color:#405a4c"><a href="${escapeEmailHtml(options.unsubscribeUrl)}" style="color:#006a25">Unsubscribe from marketing emails</a></p>` : ""}`,
    footerText: "Conference communication from AIAIAC Africa 2027.",
  });
  const text = `AIAIAC Africa 2027\n\n${input.heading}\n\n${input.body}${input.ctaLabel && input.ctaUrl ? `\n\n${input.ctaLabel}: ${input.ctaUrl}` : ""}\n\nConference communication from AIAIAC Africa 2027.`;
  return {
    subject,
    text:
      text +
      (options.unsubscribeUrl
        ? `\n\nUnsubscribe from marketing emails: ${options.unsubscribeUrl}`
        : ""),
    html,
  };
}
