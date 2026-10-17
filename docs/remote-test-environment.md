# InterServer test environment

Prepared 7 October 2026 on 162.35.8.152.

- Directory: /opt/aiaiac-staging; Compose project: aiaiac-staging.
- Backend: jaydee23/aiaiac-backend:0.1.0 pinned by digest in server .env.
- Private listener: 127.0.0.1:5000; PostgreSQL and ClamAV have no published ports.
- Existing QA database and private evidence/audit volumes retained.
- NODE_ENV=development permits the local HTTP public/Admin frontends; TRUST_PROXY_HOPS=1.
- Approved local origins: http://localhost:5173 and http://localhost:5174.
- Production will use a different Compose project, database and port 5001.
- Test domain: api-test.aiaiacafrica.com. HTTP ACME bootstrap is installed as aiaiac-test.
- Until DNS/TLS is ready, current api.aiaiacafrica.com still routes to this test stack.

## Pending domain activation

Add an A record for api-test.aiaiacafrica.com pointing to 162.35.8.152.
Then run the already uploaded script on InterServer:

```sh
bash /opt/aiaiac-staging/enable-test-domain.sh
```

It checks DNS, obtains a trusted certificate, installs the prepared Nginx HTTPS site,
validates/reloads Nginx and checks readiness. The existing Certbot timer and deploy hook
renew/reload this certificate too. Change both local frontend .env.development.local files
using deploy/frontend-test.env.example only after the readiness check succeeds.

## Provider and pipeline limits

Paystack test credentials are not configured. Existing Mailjet settings are retained;
use controlled test inboxes and clearly labelled synthetic records for any delivery tests.
GitHub test deployment variables must point to /opt/aiaiac-staging and
https://api-test.aiaiacafrica.com/api/ready. See deployment-pipeline.md for activation secrets.

Validation: Compose dependencies/backend healthy, private readiness database connected,
Nginx configuration accepted, test bootstrap responds 503 outside ACME routes as expected.
Full public HTTPS validation requires the DNS record; no self-signed certificate is used.
