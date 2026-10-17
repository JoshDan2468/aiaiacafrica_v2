/** Email-safe presentation shared by AIAIAC transactional messages. */

export function escapeEmailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export function emailInformationRows(
  rows: readonly (readonly [label: string, value: string])[],
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#f5f7f4;border:1px solid #dce4dc">${rows
    .map(
      ([label, value]) =>
        `<tr><th scope="row" align="left" valign="top" style="padding:10px 14px;border-bottom:1px solid #dce4dc;color:#405a4c;font-size:13px;font-weight:600;width:38%">${escapeEmailHtml(label)}</th><td valign="top" style="padding:10px 14px;border-bottom:1px solid #dce4dc;color:#05190f;font-size:14px;word-break:break-word">${escapeEmailHtml(value)}</td></tr>`,
    )
    .join("")}</table>`;
}

/** A table-based button with a clickable padded link and an escaped, unchanged URL. */
export function emailCta(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:collapse"><tr><td align="center" bgcolor="#006a25" style="background:#006a25;border-radius:4px;mso-padding-alt:14px 24px"><a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;border:1px solid #006a25;border-radius:4px">${escapeEmailHtml(label)}</a></td></tr></table>`;
}

function configuredLogoUrl(): string | null {
  try {
    const base = new URL(process.env.PUBLIC_FRONTEND_URL ?? "");
    return base.protocol === "https:"
      ? new URL("/brand/aiaiac-logo-light.png", base).href
      : null;
  } catch {
    return null;
  }
}

export function aiaiacEmailLayout(input: {
  title: string;
  preview: string;
  bodyHtml: string;
  footerText?: string;
}): string {
  const logoUrl = configuredLogoUrl();
  // Only the explicitly configured sender is displayed; no invented support/legal address.
  const sender = process.env.MAILJET_FROM_EMAIL?.trim();
  const contact =
    sender && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)
      ? `<br><span>${escapeEmailHtml(sender)}</span>`
      : "";
  const logo = logoUrl
    ? `<img src="${escapeEmailHtml(logoUrl)}" width="240" alt="AIAIAC" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 auto">`
    : '<p style="margin:0;font-size:30px;font-weight:700;letter-spacing:4px;color:#05190F">AIAIAC</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeEmailHtml(input.title)}</title><style>@media only screen and (max-width:480px){.email-pad{padding:24px 20px!important}.email-shell{padding:16px 8px!important}.email-title{font-size:24px!important}}</style></head><body style="margin:0;padding:0;background:#f1f4ef;color:#05190F;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none;font-size:1px;line-height:1px;color:#f1f4ef;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeEmailHtml(input.preview)}</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#f1f4ef"><tr><td class="email-shell" align="center" style="padding:36px 12px"><!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]--><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:600px;border-collapse:collapse;background:#ffffff"><tr><td height="6" bgcolor="#d1e34e" style="height:6px;background:#d1e34e;font-size:1px;line-height:6px">&nbsp;</td></tr><tr><td class="email-pad" align="center" style="padding:28px 32px;border-bottom:1px solid #e1e7df">${logo}<p style="margin:12px 0 0;font-size:11px;line-height:18px;letter-spacing:2px;color:#006a25;font-weight:700">CONFERENCE &amp; INNOVATION SHOWCASE</p></td></tr><tr><td class="email-pad" style="padding:32px;font-size:15px;line-height:1.65;color:#05190F">${input.bodyHtml}</td></tr><tr><td class="email-pad" align="center" bgcolor="#05190F" style="padding:24px 32px;background:#05190F;color:#ffffff;font-size:12px;line-height:1.7"><strong style="color:#d1e34e;font-size:14px">AIAIAC Africa 2027</strong><br>22–23 June 2027 &middot; Lagos, Nigeria${contact}<p style="margin:12px 0 0;color:#d8e3d8;font-size:11px">${escapeEmailHtml(input.footerText ?? "This is an automated transactional email.")}</p></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}
