# Admin access, invitations, RBAC, and security

## How authentication works

Admins sign in only at `/admin/login`. The API verifies an Argon2id password hash, regenerates the
server-side session, stores the session in PostgreSQL, and sends only an HttpOnly session cookie to
the browser. Every protected request reloads the Admin record, so a disabled account loses access
on its next request and a role reduction is effective immediately. There is no JWT or
browser-stored authentication token.

The existing PostgreSQL session JSON records login time and last authenticated activity. The
backend rejects a session after 30 minutes of inactivity or 12 hours from login, whichever comes
first. Protected requests slide only the inactivity deadline. Login and `/auth/me` return safe
deadline timestamps, never a session identifier. The browser cookie and stored row are capped at
the absolute deadline. Production cookies are HttpOnly, Secure, and SameSite=Lax; local HTTP
development leaves Secure off. Logout destroys the server session and clears the cookie. Admin
API 401 responses clear frontend auth, redirect to `/admin/login`, and display “Your session
expired. Please sign in again.” A browser storage event containing only a reason and timestamp
notifies other tabs; it is not an authentication token.

There is deliberately no public “Register as Admin” page or API. The first `SUPER_ADMIN` is created
with the controlled `npm run admin:create-super` setup command. All later staff accounts are created
from invitations sent by a `SUPER_ADMIN` with `users.invite` permission.

## Important folders

| Folder                              | Responsibility                                                    |
| ----------------------------------- | ----------------------------------------------------------------- |
| `backend/src/routes/`               | URLs and middleware order                                         |
| `backend/src/validators/`           | Strict validation of outside input                                |
| `backend/src/controllers/`          | HTTP request and safe response handling                           |
| `backend/src/services/`             | Invitation and user-management business rules                     |
| `backend/src/repositories/`         | Parameterized PostgreSQL access                                   |
| `backend/src/middleware/`           | Authentication, authorization, rate limits, and mutation security |
| `backend/src/config/permissions.ts` | The single role-to-permission policy                              |
| `backend/src/email/`                | Provider-neutral email service, Mailjet adapter, and templates    |
| `frontend/src/services/admin/`      | Browser calls to the Admin APIs                                   |
| `frontend/src/pages/admin/users/`   | Staff user and invitation screens                                 |

## Roles and permissions

Permissions—not React links—are the security boundary. Express checks each protected endpoint.
The API also returns the current user's computed permissions so React can hide irrelevant items.

| Role                   | Permissions                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `SUPER_ADMIN`          | All current permissions                                                       |
| `ADMIN`                | Delegates and registrations read/manage, sponsors read/manage, reports export |
| `FINANCE`              | Payments read/manage, registration payment context read, reports export       |
| `REGISTRATION_MANAGER` | Delegates and registrations read/manage, sponsors read/manage, reports export |
| `COMMUNICATIONS`       | Communications read/send foundation only                                      |

User administration uses `users.read`, `users.invite`, and `users.manage`, which belong only to
`SUPER_ADMIN`. An existing authenticated `SUPER_ADMIN` may explicitly invite another
`SUPER_ADMIN`; the service checks that role again before creating the invitation. Ordinary role
changes still cannot assign or remove `SUPER_ADMIN`.

## Invitation lifecycle

1. A Super Admin submits a name, normalized email, and invitation role. Choosing `SUPER_ADMIN`
   displays a full-control warning and is unavailable to other roles.
2. If configured, `ADMIN_ALLOWED_EMAIL_DOMAINS` is enforced.
3. The service creates 32 cryptographically random bytes and emails the raw base64url token.
4. PostgreSQL stores only the SHA-256 token hash and a configurable expiry (48 hours by default).
5. The recipient opens `/admin/accept-invite?token=...`, validates the link, and creates a password.
6. PostgreSQL locks the invitation. Account creation, invitation consumption, and the audit entry
   commit in one transaction or all roll back.
7. Accepted, expired, or revoked links cannot create an account. Resend rotates the token first,
   immediately invalidating the old link.

If Mailjet fails after invitation persistence, the API returns `502` with a safe message and the
pending invitation remains visible. Resend creates a replacement token and retries delivery; it
does not create a duplicate invitation.

For named-owner handover, keep the existing owner active until the recipient has accepted the
invitation, set their own password, and independently signed in. The invitation audit records the
inviting account ID and target email/role; no raw token is stored. Verify the recipient address
before sending, use a separate browser profile for a simultaneous login, and do not share an
existing account's credentials or session. The last-active-Super-Admin safeguard remains in force.

An existing active staff account can instead be promoted in place by a signed-in `SUPER_ADMIN`.
In **Users & Roles**, locate the named account, verify its email, select **Promote to Super Admin**,
read the full-platform-control warning, check the acknowledgment, and select **Confirm promotion**.
This preserves the account ID, email, password, sessions, and audit identity. The existing session
uses the new role on its next authenticated request, and the same credentials work at the next
sign-in. The `PATCH /api/admin/users/:id/promote` route has the usual authentication and mutation
checks, plus an explicit `SUPER_ADMIN` check in the service. It rejects inactive accounts and
already-Super-Admin targets. A transactional `USER_ROLE_CHANGED` audit identifies the actor ID,
target ID/email, previous role, and new role. The ordinary role selector still cannot grant or
remove `SUPER_ADMIN`; the last-active-owner protection remains unchanged.

## Security decisions

- Password creation reuses the existing 12–128 character Admin policy and Argon2id implementation.
- Invitation values use `randomBytes`; `Math.random` is not used for security data.
- Raw tokens, password hashes, sessions, and Mailjet secrets are excluded from API and audit data.
- Public validation returns only `VALID`, `EXPIRED`, `USED`, `REVOKED`, or `INVALID`. Invitee
  details are returned only to a holder of a valid high-entropy token.
- Public validate/accept endpoints have separate focused rate limits.
- Authenticated writes require `X-AIAIAC-CSRF: 1`. A cross-site HTML form cannot add this header;
  browser script requests trigger CORS preflight. Any supplied `Origin` or `Referer` must match the
  configured frontend origins.
- Users cannot disable or change their own role. The last active `SUPER_ADMIN` cannot be disabled,
  and the normal role endpoint cannot alter a `SUPER_ADMIN`.
- SQL remains parameterized and centralized in repositories. Public errors remain sanitized.

## Environment variables

```env
ADMIN_FRONTEND_URL=http://localhost:5173
ADMIN_SESSION_IDLE_MINUTES=30
ADMIN_SESSION_ABSOLUTE_HOURS=12
ADMIN_INVITATION_EXPIRY_HOURS=48
ADMIN_ALLOWED_EMAIL_DOMAINS=aiaiacafrica.com,aiaiacwestafrica.com
ADMIN_INVITATION_RATE_LIMIT_WINDOW_MS=900000
ADMIN_INVITATION_VALIDATE_RATE_LIMIT_MAX=500
ADMIN_INVITATION_ACCEPT_RATE_LIMIT_MAX=100
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
MAILJET_FROM_EMAIL=no-reply@example.com
MAILJET_FROM_NAME=AIAIAC
```

Leave `ADMIN_ALLOWED_EMAIL_DOMAINS` empty to permit any valid email domain. The three Mailjet
credential/sender values must be configured together and are required in production. Put secrets
only in the ignored `backend/.env`; `.env.example` contains names and safe examples only.
`SESSION_MAX_AGE_MS` is obsolete; use the two Admin session policy variables above. For local
expiry acceptance, temporarily set `ADMIN_SESSION_IDLE_MINUTES=2`, restart the backend, sign in,
stop Admin activity for two minutes, then request an Admin page/API and confirm 401 plus the login
redirect. Restore 30 minutes and 12 hours afterward. Also sign in, sign out, use Back, and verify
a fresh protected request receives 401. Frontend timers are not the security boundary. The
optional five-minute warning is not implemented. Absolute expiry without a subsequent request
cannot be audited once the cookie/store entry has expired.

## Local setup and test invitation

1. Back up the database and run `npm --prefix backend run migration:status`.
2. Review the pending migration, then run `npm --prefix backend run migration:up`.
3. Configure Mailjet and an allowed sender in `backend/.env`.
4. Run `npm run dev:backend` and `npm run dev:frontend` from the repository root.
5. Sign in as the bootstrapped Super Admin, open **Users & roles**, choose **Invite staff**, and
   send an invitation to an inbox you control.

Automated tests inject a mock provider and never contact Mailjet. For a development delivery test,
use a Mailjet-authorized sender and a controlled recipient/test inbox.

## Postman acceptance flow

Keep Postman's cookie jar enabled. Add `Content-Type: application/json` and
`X-AIAIAC-CSRF: 1` to authenticated POST/PATCH requests.

1. Log in as `SUPER_ADMIN`: `POST /api/auth/login`.
2. Invite Finance staff: `POST /api/admin/users/invitations` with
   `{"name":"Jane Doe","email":"jane@example.com","role":"FINANCE"}`. Expect `201` when
   Mailjet succeeds, or `502` with a persisted pending invitation when delivery fails.
3. Check `admin_invitations`: `token_hash` exists; no raw-token column or value exists.
4. Confirm the invitation request using automated mock tests or the controlled development inbox.
5. Copy the raw token from that email and call
   `GET /api/admin/invitations/validate?token=RAW_TOKEN`. Expect `VALID`.
6. Call `POST /api/admin/invitations/accept` with
   `{"token":"RAW_TOKEN","password":"StrongPassword1","confirmPassword":"StrongPassword1"}`.
7. Log in as the new Finance user with `POST /api/auth/login`.
8. Call a Finance-authorized API when the payment module exists. The centralized permission check
   for `payments.read` must authorize Finance.
9. Call `GET /api/admin/users` as Finance. Expect `403`.
10. Log back in as `SUPER_ADMIN`.
11. Call `GET /api/admin/users` and confirm the Finance account exists.
12. Call `PATCH /api/admin/users/USER_ID/status` with `{"isActive":false}`.
13. Reuse the Finance session on a protected request. Expect `401` because the account is reloaded.
14. Query `admin_audit_logs` and confirm `USER_INVITED`, `INVITATION_ACCEPTED`, and `USER_DISABLED`.

Also verify that revocation blocks acceptance, resend invalidates the previous token, repeated
acceptance fails, extra input fields return `400`, omitted mutation headers return `403`, and
Finance/Registration Manager/Communications cannot access user-management APIs.
