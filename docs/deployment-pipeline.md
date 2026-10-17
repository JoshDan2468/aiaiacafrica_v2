# Backend test and production deployment

The GitHub Actions pipeline deploys only the backend and its Compose dependencies.
Public and Admin frontends remain local. It uses the InterServer machine at 162.35.8.152.

## Release flow

- Changes on main affecting backend/deployment files: backend type checks, API tests and build;
  Docker Hub publication; deployment to the GitHub test environment.
- A backend-v0.1.1 tag: build and publish 0.1.1, deploy to test, then production.
- Manual Actions run: choose test or production. Production requires a new version and main ref.
- Production receives the exact digest that passed the test deployment, without rebuilding.
- Existing image tags are rejected. Deployments run serially and are not cancelled mid-migration.

Each deployment locks the server directory, validates the environment/project/loopback port,
takes a compressed PostgreSQL backup, pulls the digest, runs migrations and Compose health checks,
checks local and HTTPS readiness, confirms the running container image, and records the release.
Production requires NODE_ENV=production and an already provisioned baseline database.
No automatic database migration reversal is attempted on failure.

This is a deployable repository pipeline, not proof that GitHub credentials/environments have been
configured or that a production run has completed. The workflows must be committed and pushed.

## GitHub setup

Repository: JoshDan2468/aiaiac_v1. Create environments named test and production.
Configure production deployment branch/tag rules and required reviewers if approval is desired.
The workflow itself waits only for protections configured in GitHub.

Repository secrets (build job):

| Secret | Value |
| --- | --- |
| DOCKERHUB_USERNAME | jaydee23 |
| DOCKERHUB_TOKEN | Docker Hub access token with permission to push aiaiac-backend |

Optional repository variable DOCKERHUB_REPOSITORY defaults to jaydee23/aiaiac-backend.

Set these separately in each GitHub environment:

| Setting | Test | Production |
| --- | --- | --- |
| Variable DEPLOY_HOST | 162.35.8.152 | 162.35.8.152 |
| Variable DEPLOY_USER | ops (or dedicated deployment user) | ops (or dedicated deployment user) |
| Variable DEPLOY_DIRECTORY | /opt/aiaiac-staging (existing) | /opt/aiaiac-production |
| Variable API_READINESS_URL | https://api-test.aiaiacafrica.com/api/ready | https://api.aiaiacafrica.com/api/ready |
| Secret DEPLOY_SSH_KEY | Private deployment SSH key | Separate private deployment SSH key |
| Secret DEPLOY_KNOWN_HOSTS | Verified server SSH host key line | Verified server SSH host key line |

Use dedicated CI keys rather than copying a personal SSH identity into GitHub.
Install their public keys on the server deployment account. This account requires access to the
target directory and passwordless Docker access (direct Docker or sudo -n docker).
Docker access is privileged; restrict repository/environment access accordingly.
Obtain host keys through a trusted server connection; do not disable host-key checking.
Runtime database/session/Mailjet/Paystack secrets stay in server-owned files, never workflow YAML.
If Docker Hub becomes private, authenticate the server Docker command as well.

## Server environment separation

Keep the current test database/project aiaiac-staging intact. Its server .env must retain
COMPOSE_PROJECT_NAME=aiaiac-staging and BACKEND_PORT=5000.

Provision production separately at /opt/aiaiac-production using
deploy/compose.production.env.example as .env and deploy/backend.production.env.example as
deploy/backend.env. Use unique database passwords and session secrets. Production project must be
aiaiac-production and loopback port 5001. Compose project names isolate PostgreSQL, evidence, audit,
database certificates and scanner volumes. Budget RAM/storage for two complete stacks.

Configure production HTTPS frontend origins and real provider credentials, including Paystack;
production startup enforces these requirements. Local HTTP frontends remain connected to test.
Use Paystack test credentials and a controlled inbox for test acceptance; never use live payment
credentials for synthetic test traffic. Provision the initial production owner separately.

Give test and production different API domains and Nginx upstreams (5000 and 5001 respectively).
The approved layout is api-test.aiaiacafrica.com for test and api.aiaiacafrica.com for production.
The current api.aiaiacafrica.com still serves test until production is configured and cut over.
Add DNS for api-test, issue its TLS certificate, switch local proxies to api-test, then repoint
the api domain upstream to production port 5001 only after production health succeeds. The readiness URL
must correspond to that environment's Nginx upstream; a readiness check alone cannot prove routing.

Test Nginx site template: deploy/nginx-test-api.conf. Issue the test certificate using an HTTP-only
ACME bootstrap site before enabling its HTTPS configuration. Copy deploy/frontend-test.env.example
to each local frontend's .env.development.local after DNS/TLS is ready. For production cutover,
change the existing api.aiaiacafrica.com site's proxy_pass from 5000 to 5001, validate with nginx -t,
reload, and verify HTTPS readiness. Do not repoint the current domain ahead of a healthy production
stack. The existing deploy/nginx-api.conf intentionally retains the current working upstream until
this explicit cutover.

Start the production stack deliberately and validate it before enabling CI deployment:

```sh
cd /opt/aiaiac-production
sudo docker compose up -d --no-build --wait --wait-timeout 900
```

Server .env files and backend.env should be mode 600, directories private.
Do not use compose.interserver.yaml alongside the installed host Nginx.

## Releases and recovery

From main, create and push a new tag, for example backend-v0.1.1, after reviewing the release.
Test deploys first; production follows only if test succeeded and environment protection permits.
For an unpublished release, use the manual Actions run. Choose a new version if a publication
succeeded but deployment failed; rerun failed deployment jobs to reuse the published digest.

Each target stores backups/YYYYMMDDTHHMMSSZ.sql.gz, release snapshots under releases/RUN-ATTEMPT,
and deployed-image.txt. previous.env contains secrets and stays private on the server.
Backups cover PostgreSQL only: also back up evidence/audit volumes and verify off-server restore.
Monitor disk use and apply a reviewed backup/release retention policy.

On failure inspect the Actions log and server Compose logs. A failed health check may leave the
new image running; deployed-image.txt/.env are updated only after success. Compare actual image
with the last recorded release. Before rollback, review migration compatibility. Restore the
previous image/config only when compatible; database restoration is a separate deliberate operation.
Do not automatically run down migrations or delete volumes.

scripts/deploy-remote.ps1 remains a manual version-based fallback; it clears a saved digest when
selecting a version. The CI pipeline is the preferred route for backups and environment validation.

## Validation performed

Workflow YAML/actionlint and deploy script ShellCheck passed. Compose production configuration
renders aiaiac-production on loopback 5001 with NODE_ENV=production and an explicit image digest.
The test server completed an actual pre-deployment PostgreSQL backup, migration/health sequence,
digest verification and HTTPS readiness with the existing 0.1.0 digest. Production targeting the
test directory was rejected before mutation. Backend tests: 278 passed, 1 skipped. All package
type checks/builds passed; frontend lint retains only existing warnings (public 12, Admin 3).

The unit test suite expects development mode and localhost:5173 origins; CI supplies these
explicitly. A local run initially loaded production settings from backend/.env; it passed after
using the same isolated test configuration as CI. This does not weaken the production deploy guard.
