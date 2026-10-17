import { escapeEmailHtml } from "./aiaiacEmailLayout";

/** Presentation only. The existing payment service decides whether to issue a pass. */
export function eventPassTicket(input: {
  fullName: string;
  registrationReference: string;
  category: string;
}): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid #dce4dc;background:#ffffff"><tr><td bgcolor="#05190F" style="padding:20px;background:#05190F;color:#ffffff"><p style="margin:0;font-size:11px;letter-spacing:2px;color:#d1e34e;font-weight:700">EVENT PASS</p><h2 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700">AIAIAC Africa 2027</h2><p style="margin:8px 0 0;font-size:13px;line-height:1.6">22–23 June 2027 &middot; Lagos, Nigeria</p></td></tr><tr><td style="padding:20px;color:#05190F"><p style="margin:0;font-size:11px;letter-spacing:1px;color:#006a25;font-weight:700">ATTENDEE</p><p style="margin:6px 0 4px;font-size:22px;line-height:1.35;font-weight:700;word-break:break-word">${escapeEmailHtml(input.fullName)}</p><p style="margin:0;font-size:14px;line-height:1.5">${escapeEmailHtml(input.category)}</p><p style="margin:18px 0 4px;font-size:11px;color:#006a25;font-weight:700">REGISTRATION REFERENCE</p><p style="margin:0;font-size:14px;line-height:1.5;font-weight:700;word-break:break-word">${escapeEmailHtml(input.registrationReference)}</p></td></tr><tr><td align="center" style="padding:24px 16px;border-top:1px dashed #b6c7b6"><img src="cid:aiaiac-event-pass-qr" width="220" height="220" alt="AIAIAC Africa 2027 Event Pass QR code for check-in" style="display:block;width:220px;max-width:100%;height:auto;background:#ffffff;border:0"><p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#405a4c">Present this QR code at event check-in.</p></td></tr></table>`;
}
