# Email ownership verification

New Professional and Student Delegate registrations start with
`email_verification_status = 'UNVERIFIED'`. The backend issues a random,
single-use token, stores only its SHA-256 hash, and sends the raw token only in
the transactional verification link. Payment initialization requires a
`VERIFIED` email in addition to all existing registration, Student approval,
and active-price rules.

## Existing-registration migration policy

Registrations created before migration `20260929000000000` are backfilled as
`VERIFIED`, with `email_verified_at` set to their existing submission or
creation timestamp. These registrations were already accepted by the previous
production workflow, so this avoids retroactively locking legitimate delegates
out of payment. After the backfill, the database default is changed to
`UNVERIFIED` for every new registration.

Resending rotates the stored hash, invalidating the previous link. A successful
verification consumes the current token. Expired, invalid, resend, delivery,
and completion events contain no raw token material.
