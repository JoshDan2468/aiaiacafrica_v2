# AIAIAC API

This package contains the Express, TypeScript, and PostgreSQL API, including the server-managed
Admin authentication foundation, Delegate Registration, and Professional Delegate payment through
Paystack. Other conference business workflows are not included.

## Setup

```sh
npm install
copy .env.example .env
npm run dev
```

On macOS or Linux, replace `copy` with `cp`. Replace every placeholder in the untracked `.env`.
Never commit `.env` or use a PostgreSQL superuser as the application user.

## Environment variables

| Variable                                     | Required at API startup | Purpose                                                                                     |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                   | No                      | `development`, `test`, or `production`; defaults to `development`                           |
| `PORT`                                       | No                      | HTTP port; defaults to `5000`                                                               |
| `CLIENT_URL`                                 | Production              | Comma-separated exact frontend origins                                                      |
| `DATABASE_URL`                               | Yes                     | Backend-only PostgreSQL connection URL                                                      |
| `SESSION_SECRET`                             | Yes                     | At least 32 random, non-placeholder characters                                              |
| `SESSION_MAX_AGE_MS`                         | No                      | Fixed cookie/session lifetime; defaults to 8 hours                                          |
| `LOGIN_RATE_LIMIT_WINDOW_MS`                 | No                      | Login failure window; defaults to 15 minutes                                                |
| `LOGIN_RATE_LIMIT_MAX`                       | No                      | Failed attempts per IP/window; defaults to 100 outside production and 10 in production      |
| `DELEGATE_REGISTRATION_RATE_LIMIT_WINDOW_MS` | No                      | Public delegate submission window; defaults to 15 minutes                                   |
| `DELEGATE_REGISTRATION_RATE_LIMIT_MAX`       | No                      | Delegate submissions per IP/window; defaults to 100 outside production and 20 in production |
| `ADMIN_FRONTEND_URL`                         | Production              | Exact frontend origin used for invitation links                                             |
| `ADMIN_INVITATION_EXPIRY_HOURS`              | No                      | Invitation validity; defaults to 48 hours                                                   |
| `ADMIN_ALLOWED_EMAIL_DOMAINS`                | No                      | Optional comma-separated staff email domains                                                |
| `ADMIN_INVITATION_RATE_LIMIT_WINDOW_MS`      | No                      | Public invitation endpoint rate-limit window                                                |
| `ADMIN_INVITATION_VALIDATE_RATE_LIMIT_MAX`   | No                      | Token validations per IP/window                                                             |
| `ADMIN_INVITATION_ACCEPT_RATE_LIMIT_MAX`     | No                      | Acceptance attempts per IP/window                                                           |
| `MAILJET_API_KEY` / `MAILJET_SECRET_KEY`     | Production              | Backend-only Mailjet credentials; configure together                                        |
| `MAILJET_FROM_EMAIL` / `MAILJET_FROM_NAME`   | Production              | Authorized transactional sender                                                             |
| `PAYSTACK_SECRET_KEY`                        | Production              | Backend-only Paystack credential; use a test key in development                             |
| `PAYSTACK_CALLBACK_URL`                      | No                      | Hosted-checkout return URL; defaults to the local payment callback                          |
| `PAYMENT_NOTIFICATION_ROLES`                 | No                      | Comma-separated `SUPER_ADMIN`/`FINANCE` payment recipients; defaults to `SUPER_ADMIN`       |

Example development configuration:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/aiaiac_dev
SESSION_SECRET=REPLACE_WITH_A_LONG_RANDOM_VALUE
SESSION_MAX_AGE_MS=28800000
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=100
DELEGATE_REGISTRATION_RATE_LIMIT_WINDOW_MS=900000
DELEGATE_REGISTRATION_RATE_LIMIT_MAX=100
```

Generate a session secret locally, then paste its output into the untracked `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use separate databases and credentials for development, test, and production. The connection URL
is validated without being logged or returned to clients. The small health-only app factory can be
used in database-free unit tests, but the configured API refuses to start without `DATABASE_URL`
and `SESSION_SECRET`. Production SSL settings depend on the selected PostgreSQL provider and must
be configured according to that provider's certificate requirements before deployment.

## API probes

```http
GET http://localhost:5000/api/health
GET http://localhost:5000/api/ready
GET http://localhost:5000/api/not-real
```

`/api/health` is a process liveness probe and remains `200` when PostgreSQL is unavailable.
`/api/ready` executes `SELECT 1;`, returning `200` with `database: "connected"` or a sanitized `503`
with `database: "disconnected"`. Unknown API routes return predictable JSON `404` responses.

## Admin authentication setup

Apply the reviewed authentication migration deliberately:

```sh
npm run migration:status
npm run migration:up
```

It creates `admins`, the `connect-pg-simple`-compatible `session` table, `delegate_packages`, and
`delegate_registrations`. Professional Delegate currently has independently configured active
prices of USD 1,500 and NGN ₦2,100,000; payment initialization resolves the selected price from
`delegate_package_prices`.
Runtime table creation is disabled. The migration down command removes migrated tables and their
data, so use it only for an intentional rollback.

Create the first Super Admin with temporary values in the untracked `.env`:

```env
INITIAL_SUPER_ADMIN_NAME=Conference Owner
INITIAL_SUPER_ADMIN_EMAIL=owner@example.com
INITIAL_SUPER_ADMIN_PASSWORD=USE_A_STRONG_UNIQUE_PASSWORD
```

```sh
npm run admin:create-super
```

The command normalizes the email, creates a UUID, hashes the password with Argon2id, and refuses a
duplicate email. It never prints the password. Remove all three `INITIAL_SUPER_ADMIN_*` values from
`.env` immediately after success. There is no public registration endpoint.

## Authentication API and Postman

Postman must keep its cookie jar enabled. Use the same Postman session for this sequence:

1. `POST http://localhost:5000/api/auth/login` with `Content-Type: application/json` and body
   `{"email":"owner@example.com","password":"your-password"}`. Expect `200` and an HttpOnly
   `aiaiac.admin.sid` cookie.
2. `GET http://localhost:5000/api/auth/me`. Expect `200`; a request without that cookie gets `401`.
3. `GET http://localhost:5000/api/admin/test`. Both roles get `200`; no session gets `401`.
4. `GET http://localhost:5000/api/admin/super-admin-test`. `SUPER_ADMIN` gets `200`, `ADMIN` gets
   `403`, and no session gets `401`.
5. `POST http://localhost:5000/api/auth/logout`. Expect `200` and an expired cookie.
6. Repeat `GET http://localhost:5000/api/auth/me`. Expect `401`.

Wrong passwords and unknown emails both return `401` with `Invalid email or password`. Login is
temporarily rate-limited per IP; health and readiness are not. Future browser calls must use
`credentials: "include"` (or Axios `withCredentials: true`).

Sessions are stored in PostgreSQL with a fixed expiry. Cookies are HttpOnly, `SameSite=Lax`, and
become `Secure` in production. Every protected request reloads the Admin, so deleted or disabled
accounts immediately lose protected access. In production behind a TLS-terminating reverse proxy,
configure and test Express proxy trust before launch so Secure cookies behave correctly.

Exact-origin CORS and `SameSite=Lax` reduce CSRF exposure but are not complete CSRF protection.
Admin user mutations now require `X-AIAIAC-CSRF: 1` and validate supplied browser origins/referrers.
Do not treat CORS or frontend navigation as authorization.

The complete invitation lifecycle, role matrix, environment setup, and Postman acceptance flow are
documented in [`../docs/admin-access.md`](../docs/admin-access.md).

The payment model, security invariants, Paystack test setup, and exact acceptance flow are in
[`../docs/delegate-payments.md`](../docs/delegate-payments.md).
Payment completion, event-pass issuance, oversight notification, and live Admin overview behavior
are documented in [`../docs/payment-completion.md`](../docs/payment-completion.md).
Student Delegate private evidence requirements, continuation authorization, quarantine, storage,
scanner, retrieval, and deployment boundaries are documented in
[`../docs/student-delegate-verification.md`](../docs/student-delegate-verification.md).

## Delegate registration API and Postman

The public request is intentionally narrow. The server validates every field, derives price and
package snapshots from PostgreSQL, and creates registrations only as `SUBMITTED` with payment
`PENDING`. A browser must never send price, status, payment state, or package snapshot fields.

1. `GET http://localhost:5000/api/delegate-packages` returns active packages only.
2. `POST http://localhost:5000/api/delegate-registrations` with a package UUID and the approved
   applicant fields (`firstName`, `lastName`, `email`, phone, professional details, consent) returns
   `201`, an `AIAIAC-DEL-XXXXXXXX` reference, `SUBMITTED`, and `PENDING`. Privacy consent must be
   `true`; repeating a normalized email for a package returns a safe `409`. Extra fields, including
   price or payment fields, return `400`.
3. After Admin login in the same Postman cookie jar, both `ADMIN` and `SUPER_ADMIN` may call
   `GET /api/admin/delegates` and `GET /api/admin/delegates/:id`. The list intentionally excludes
   contact details; the detail endpoint is protected operations content.

Package capacity is stored for future use but not reserved or enforced in this milestone. Any
future capacity feature must enforce availability transactionally with the registration insert.

## Commands

| Command                            | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `npm run dev`                      | Run the API in watch mode                                |
| `npm run type-check`               | Type-check application and test code                     |
| `npm test`                         | Run unit/API tests without requiring a live database     |
| `npm run build`                    | Compile production JavaScript into `dist/`               |
| `npm start`                        | Run the compiled API                                     |
| `npm run migration:create -- name` | Create a timestamped TypeScript migration                |
| `npm run migration:status`         | Show pending migration SQL without applying it           |
| `npm run migration:up`             | Apply all pending migrations deliberately                |
| `npm run migration:down`           | Roll back one migration deliberately                     |
| `npm run admin:create-super`       | Create the initial Super Admin from temporary env values |

Migration commands read `DATABASE_URL` from `backend/.env`. The migration tool records applied
files in its `pgmigrations` history table. The server never runs migrations automatically. Review
new migrations and their rollback behavior before applying them, especially in production.

The application also uses Helmet security headers, a `100kb` JSON request-body limit, a separate
bounded multipart limit for Student evidence, credentialed exact-origin CORS, development request
logging that excludes bodies and query strings, predictable JSON errors, and graceful
HTTP/database-pool shutdown. Sponsor, exhibitor, Student Delegate review/payment, CSV export, and
non-delegate participation workflows remain unimplemented.
