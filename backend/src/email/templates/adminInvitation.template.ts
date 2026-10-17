import { aiaiacEmailLayout, emailCta } from "./aiaiacEmailLayout";
/** Builds the plain-text and HTML forms of the single transactional invitation email. */

interface AdminInvitationTemplateInput {
  readonly fullName: string;
  readonly role: string;
  readonly invitationUrl: string;
  readonly expiresAt: Date;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export function adminInvitationTemplate(input: AdminInvitationTemplateInput) {
  const expiry = input.expiresAt.toISOString();
  const subject = "Your AIAIAC administrator invitation";
  const text = [
    `Hello ${input.fullName},`,
    "",
    `You have been invited to the AIAIAC administration workspace as ${input.role}.`,
    `Create your password before ${expiry}:`,
    input.invitationUrl,
    "",
    "This link is single-use. If you did not expect this invitation, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#16251f;max-width:620px">
      <h1 style="font-size:24px">AIAIAC administrator invitation</h1>
      <p>Hello ${escapeHtml(input.fullName)},</p>
      <p>You have been invited to the AIAIAC administration workspace as
        <strong>${escapeHtml(input.role)}</strong>.</p>
      ${emailCta(input.invitationUrl, "Create your password")}
      <p>This single-use link expires at ${escapeHtml(expiry)}.</p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    </div>
  `.trim();
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: subject,
      preview: "Your invitation to the AIAIAC administration workspace.",
      bodyHtml: html,
    }),
  };
}
