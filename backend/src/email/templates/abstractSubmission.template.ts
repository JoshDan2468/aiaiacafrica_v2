import { aiaiacEmailLayout, emailCta } from "./aiaiacEmailLayout";
import type { AbstractNotificationEmailInput } from "../email.types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function content(input: AbstractNotificationEmailInput) {
  switch (input.notificationType) {
    case "SUBMITTED":
      return {
        subject: "AIAIAC 2027 abstract received",
        heading: "Abstract submitted successfully",
        message:
          "Your abstract is under review. The submission deadline is 15 March 2027. Speaker participation and the speaker fee remain to be confirmed separately.",
      };
    case "RESUBMITTED":
      return {
        subject: "AIAIAC 2027 abstract revision received",
        heading: "Revised abstract received",
        message:
          "Your revised abstract has been resubmitted and will return to the conference review queue.",
      };
    case "REVISION_REQUIRED":
      return {
        subject: "Revision required for your AIAIAC 2027 abstract",
        heading: "Abstract revision required",
        message: `Please revise and explicitly resubmit your abstract. Instruction: ${input.authorVisibleReason ?? "Please contact the programme team."}`,
      };
    case "ACCEPTED":
      return {
        subject: "AIAIAC 2027 abstract decision",
        heading: "Your abstract has been accepted",
        message:
          "Your abstract has been accepted. Further speaker participation and programme information will be communicated separately. The speaker fee remains TBA.",
      };
    case "REJECTED":
      return {
        subject: "AIAIAC 2027 abstract decision",
        heading: "Abstract decision",
        message: `We are unable to accept this abstract for the programme at this time. Reason: ${input.authorVisibleReason ?? "Please contact the programme team."}`,
      };
  }
}

export function abstractSubmissionTemplate(
  input: AbstractNotificationEmailInput,
  workspaceUrl?: string,
) {
  const selected = content(input);
  const workspaceLine = workspaceUrl
    ? `Secure author workspace: ${workspaceUrl}`
    : null;
  return {
    subject: selected.subject,
    text: [
      `Hello ${input.fullName},`,
      selected.message,
      `Abstract reference: ${input.reference}`,
      `Title: ${input.title}`,
      `Status: ${input.notificationType}`,
      workspaceLine,
      "AIAIAC 2027 · 22–23 June 2027 · Lagos, Nigeria",
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: aiaiacEmailLayout({
      title: selected.heading,
      preview: selected.heading,
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">${escapeHtml(selected.heading)}</h1><p>Hello ${escapeHtml(input.fullName)},</p><p>${escapeHtml(selected.message)}</p><p><strong>Abstract reference:</strong> ${escapeHtml(input.reference)}<br><strong>Title:</strong> ${escapeHtml(input.title)}<br><strong>Status:</strong> ${escapeHtml(input.notificationType)}</p>${workspaceUrl ? emailCta(workspaceUrl, "Open the secure author workspace") : ""}<p>AIAIAC 2027 · 22–23 June 2027 · Lagos, Nigeria</p>`,
    }),
  };
}

export function abstractRecoveryTemplate(input: {
  fullName: string;
  reference: string;
  title: string;
  recoveryUrl: string;
  expiresAt: Date;
}) {
  const expires = input.expiresAt.toISOString();
  return {
    subject: "Restore access to your AIAIAC 2027 abstract",
    text: [
      `Hello ${input.fullName},`,
      "Use this single-use secure link to restore access to your abstract workspace.",
      `Abstract reference: ${input.reference}`,
      `Title: ${input.title}`,
      input.recoveryUrl,
      `This link expires at ${expires}.`,
    ].join("\n\n"),
    html: aiaiacEmailLayout({
      title: "Restore abstract workspace access",
      preview: "Restore abstract workspace access",
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Restore abstract workspace access</h1><p>Hello ${escapeHtml(input.fullName)},</p><p>Use this single-use secure link to restore access to your abstract workspace.</p><p><strong>Abstract reference:</strong> ${escapeHtml(input.reference)}<br><strong>Title:</strong> ${escapeHtml(input.title)}</p>${emailCta(input.recoveryUrl, "Restore secure access")}<p>This link expires at ${escapeHtml(expires)}.</p>`,
    }),
  };
}
