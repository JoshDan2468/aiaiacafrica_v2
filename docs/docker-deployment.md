# Backend containers and InterServer

For GitHub test/production releases, see [Deployment pipeline](deployment-pipeline.md).

## Active InterServer domain setup (7 October 2026)

The deployed staging API is now available at https://api.aiaiacafrica.com/api/ready.
Nginx and Certbot run as host systemd services; Compose manages the backend and its dependencies.
The Caddy instructions below describe an alternative setup. Do not start the Caddy override
while Nginx owns ports 80/443. The old SSH staging instructions below are historical.

The installed site `/etc/nginx/sites-available/aiaiac-api` uses `deploy/nginx-api.conf`.
HTTP redirects to HTTPS. Only `/api/` is proxied to server loopback port 5000.
IP/unknown-host HTTP requests are rejected with 444; unknown TLS SNI is rejected at handshake.
PostgreSQL, scanner and backend port 5000 have no public listener.
Host routing is not client authentication: a client supplying the valid domain can access public
API routes. Protected routes still require backend authentication. Authorized SSH users and
privileged server processes retain access to loopback.

Both local frontends use empty VITE_API_URL and
API_PROXY_TARGET=https://api.aiaiacafrica.com in ignored .env.development.local files.
Vite verifies TLS certificates. Start only `npm run dev:frontend` and `npm run dev:admin`;
the tunnel is no longer required. Staging retains development cookie settings for local HTTP
frontends and now uses TRUST_PROXY_HOPS=1. Nginx overwrites forwarded IP/protocol headers.

Certbot stores certificates in `/etc/letsencrypt/live/api.aiaiacafrica.com/`.
Initial expiry: 5 January 2027. `certbot.timer` renews automatically; the deployment hook
`/etc/letsencrypt/renewal-hooks/deploy/aiaiac-nginx` uses `deploy/nginx-renew-hook.sh`
to validate and reload Nginx. ACME webroot: `/var/www/letsencrypt`.
The ACME account was registered without an email; an operator notification address can be added
using `sudo certbot update_account --email ADDRESS`.

Verified: domain readiness 200/database connected; HTTP 308 to HTTPS; IP HTTP/TLS rejected;
public port 5000 refused; both frontend proxies 200; Admin login/session/overview/logout 200.
Certificate renewal dry run, including the Nginx validation/reload hook, also succeeded.

`compose.yaml` manages the API, PostgreSQL, ClamAV/freshclam, persistent evidence and
audit volumes, database TLS initialization, and a one-shot migration job. Startup waits
for dependencies and successful migrations. Mailjet and Paystack remain external providers.
The public and Admin frontends still deploy separately; set their API URLs to this backend.

## Local setup

Copy `.env.example` to `.env` and `deploy/backend.env.example` to `deploy/backend.env`.
Generate distinct secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
for POSTGRES_PASSWORD and SESSION_SECRET. Do not copy the existing backend/.env database URL:
Compose provides its own PostgreSQL URL and trusted CA. Configure other application settings in
deploy/backend.env using backend/.env.example as the reference.

```powershell
docker compose up -d
docker compose ps
curl.exe http://localhost:5000/api/ready
docker compose logs --tail 100 backend migrate clamav
```

First startup downloads antivirus signatures and may take several minutes. Reserve at least
4 GB RAM for the complete stack. Local API runs in development mode for HTTP cookies but uses
the explicitly configured real scanner/storage. No source watch is enabled; release builds are
reproducible from the lockfile. PostgreSQL and ClamAV have no published ports.

## Versioned build and Docker Hub publication

Authenticate with `docker login` using your Docker Hub account/token, then run:

```powershell
./scripts/publish-backend.ps1 -Version 0.1.0
```

This builds a Linux amd64 image and pushes it in the same command. Use a new version for
each release; never overwrite deployed version tags. Bare `docker build` and Compose's initial
local build do not automatically publish: use the release command for all publishable builds.
The default repository is `jaydee23/aiaiac-backend`, verified from Docker Hub account settings.
It is public. Override it with `-Repository` when needed. Set
BACKEND_IMAGE=docker.io/jaydee23/aiaiac-backend and BACKEND_VERSION in .env to run it.

GitHub Actions also publishes on `backend-v0.1.0` tags or manual version input after backend
checks. Optionally override repository variable DOCKERHUB_REPOSITORY; set secrets DOCKERHUB_USERNAME and
DOCKERHUB_TOKEN. The workflow must be committed/pushed before it can execute.

## InterServer setup and deploy to remote

Remote always means the InterServer machine. Install Docker Engine with Compose v2 on the
Linux server. Copy compose.yaml, compose.interserver.yaml and deploy/Caddyfile into /opt/aiaiac.
Create /opt/aiaiac/.env from .env.example and deploy/backend.env from the production example.
Set the Docker Hub image, release version, API_DOMAIN and
`COMPOSE_FILE=compose.yaml:compose.interserver.yaml` in the server .env. Keep NODE_ENV=production
and TRUST_PROXY_HOPS=1 behind this Caddy proxy. Set real HTTPS frontend origins, Mailjet credentials,
Paystack credentials/callback and a unique session secret. Restrict env files with chmod 600.
Point API_DOMAIN DNS at InterServer and allow ports 80/443 for Caddy's automatic HTTPS.
If another web server already owns those ports, integrate its reverse proxy instead of Caddy.

On the server authenticate with `docker login` if the repository is private, then:

```sh
cd /opt/aiaiac
docker compose pull
docker compose up -d --no-build --wait --wait-timeout 900
```

For subsequent releases from this Windows workspace:

```powershell
./scripts/deploy-remote.ps1 -InterServerHost USER@INTERSERVER_HOST -RemoteDirectory /opt/aiaiac -Version 0.1.1
```

This uses SSH and the server's configuration/login, pulls the version, runs migrations and waits
for health. It does not upload secrets. After success it saves BACKEND_VERSION in the server .env
so later manual commands select the same release.

## Current InterServer staging test (no API domain)

InterServer is reachable using the existing SSH config entry `162.35.8.152` as `ops`.
The deployed staging stack is in `/opt/aiaiac-staging`, with Compose project
`aiaiac-staging`, backend `jaydee23/aiaiac-backend:0.1.0`, and its own new PostgreSQL database.
The Docker CLI requires passwordless sudo for this user; the deployment script detects that.
The script now defaults to this host and staging directory. Production deployments must pass
`-RemoteDirectory /opt/aiaiac` explicitly after production has been configured.

The staging API listens only at server `127.0.0.1:5000`. No API, PostgreSQL or scanner port is
exposed to the internet. Staging runs with `NODE_ENV=development` to support localhost HTTP
origins/cookies; production still requires HTTPS, verified database TLS and real provider config.
Mailjet is configured from the existing backend settings, but Paystack is intentionally omitted
because the existing key is not a test-mode key. No payment or email-delivery acceptance was run.

Both local apps use same-origin `/api` requests through the Vite proxy and an SSH tunnel:

```text
Browser -> localhost:5173 (public) or localhost:5174 (Admin)
        -> Vite /api proxy -> localhost:5500
        -> encrypted SSH -> InterServer localhost:5000 -> backend/PostgreSQL/ClamAV
```

`deploy/frontend-remote.env.example` is copied to each app's `.env.development.local`.
These ignored files set an empty VITE_API_URL and API_PROXY_TARGET=http://127.0.0.1:5500;
the latter is read only by the Vite development server, not exposed as a browser secret.
Normal production builds use their independently configured VITE_API_URL.

After restarting your computer, use three terminals:

```powershell
./scripts/connect-interserver.ps1
npm run dev:frontend
npm run dev:admin
```

Keep the tunnel terminal open. Test at http://localhost:5173 and http://localhost:5174/admin.
Do not use the server IP as the browser API URL: the tunnel and same-origin proxy are deliberate.
To return to the local Compose backend, remove or change each `.env.development.local` override
and restart both Vite servers. The previous local database/Compose stack was not migrated or removed.

A staging-only Super Admin was created as `interserver-test@example.invalid`. Its generated
password is in local ignored `.private/interserver/bootstrap.env`; the bootstrap file was removed
from the server immediately after use. Treat this account as a test account, not the production owner.
Authenticated overview and session endpoints, public packages, invalid-enquiry validation,
browser Admin overview and remote scanner health were checked. No real registrations were submitted.

For another staging release:

```powershell
./scripts/publish-backend.ps1 -Version 0.1.1
./scripts/deploy-remote.ps1 -Version 0.1.1
```

Before public production use, configure the API domain/HTTPS, production frontend origins,
production environment/provider settings, the real owner account and backups, then validate
payments, webhooks and email delivery in the correct environment.

## Data and operations

This creates a new database; existing local/remote records require a planned pg_dump/restore.
Provision the initial Super Admin once using `docker compose run --rm --no-deps -e NODE_ENV=development
-e INITIAL_SUPER_ADMIN_NAME -e INITIAL_SUPER_ADMIN_EMAIL -e INITIAL_SUPER_ADMIN_PASSWORD backend
node dist/scripts/create-super-admin.js` with those three variables temporarily exported in the shell.
Development here is only for this one-shot bootstrap; never place bootstrap secrets in runtime env.

Back up PostgreSQL with pg_dump and the evidence/audit volumes; test restoration. `docker compose down`
preserves data; `down -v` deletes it. Changing POSTGRES_PASSWORD does not change an existing database
password: rotate the database role and configuration together. Database server certificates expire
after 825 days; schedule certificate renewal using the stored CA and restart PostgreSQL/backend.
Protect CA private keys and back up the certificate volume. For production, assess host/disk backups,
signature freshness, disk capacity and external uptime monitoring.

Take a database backup before upgrading. Migrations run automatically before the API starts and may
change rollback compatibility; reverting the image does not revert the database. Deployments require
a short maintenance window and a reviewed migration/restore plan. Compose runs one API instance to
match in-process rate limiting and the audit writer's single-instance requirements.

### Hosted Admin sessions across domains

When Admin and the API use different base domains, configure `SESSION_COOKIE_SAME_SITE=none`
in the backend environment. This always sets `Secure` and requires HTTPS; the default `lax`
retains local HTTP development support. Keep exact frontend origins in `CLIENT_URL`.
The origin and session CSRF checks still apply. Browsers that block third-party cookies may
require an `/api` reverse proxy on the Admin host, even with `SameSite=None`.
