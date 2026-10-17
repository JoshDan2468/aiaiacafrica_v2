# Unified transactional email design

The reusable layout is `backend/src/email/templates/aiaiacEmailLayout.ts`. It uses a centered
600px table, inline CSS, an Outlook conditional wrapper, and optional narrow-screen spacing.
Forest (`#006a25`) and lime (`#d1e34e`) are sRGB conversions of the existing frontend OKLCH
brand tokens; the dark green is `#05190F`.

The existing `aiaiac-logo-light.png` is loaded from the configured HTTPS `PUBLIC_FRONTEND_URL`.
If no HTTPS frontend origin is configured, the header uses the AIAIAC text mark. The logo remains
optional imagery; essential instructions and references are HTML text. The footer displays only
the existing conference date/location and configured Mailjet sender; no legal or address text
was added. Remote-image availability and inbox rendering need separate provider/client checks.

Verification, invitations, recovery, Student updates and author workspace links use the same
table-based CTA. Sponsor/exhibitor decisions and other messages without an existing destination
do not acquire invented links. Subject lines, plain-text content, token URLs and triggers remain
unchanged. The Event Pass ticket retains `cid:aiaiac-event-pass-qr` and the existing inline PNG
attachment. Its attendee, category and reference are escaped; no raw pass credential is printed.

Run `npm --prefix backend run email:preview` to generate 32 synthetic message previews and the
`backend/email-previews/index.html` gallery. Logo imagery is copied locally for previews. Preview
links use `.invalid` hosts and the QR contains an explicitly non-valid credential. The command
neither sends messages nor touches the database unless its existing explicit `--send-test`
option is supplied. It was not supplied for this change.

Browser screenshots: `event-pass-desktop.png`, `event-pass-mobile.png` and
`verification-mobile.png` in the preview directory. Browser checks do not establish Gmail,
Apple Mail or Outlook inbox compatibility; controlled test delivery remains necessary.

The two requested visual-reference screenshots were not available in this message. The design
uses the written direction and existing assets; matching those images remains pending receipt.
