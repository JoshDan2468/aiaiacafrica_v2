# Isolated local application environment for one fictional Gemini E2E test

Prepared without activating Gemini, submitting an abstract or making external API requests.

## Dedicated database

- PostgreSQL 18 private test cluster: `.private/abstract-ai-acceptance-20261014/cluster`.
- Listener: `127.0.0.1:55437`; dedicated application database/schema: `aiaiac_gemini_e2e_local` / `public`.
- Dedicated login role has no superuser, create-database, create-role or replication privileges.
- Database created from template0, marked as dedicated to fictional local testing and restricted to its application role. Existing development/production/shared databases were not migrated, reset or deleted.
- All 33 existing backend migrations applied through node-pg-migrate, in a single transaction, to this new database only. Built-in reference/catalog seeds are present; no author data was imported.
- Verified counts: abstracts 0, jobs 0, attempts 0, results 0, admins 0, sessions 0.
- The private PostgreSQL server remains running for the prepared environment. The API and AI worker were not started.

## Configuration without changing the existing development connection

The existing `backend/.env` was not changed. An ignored private file `.private/gemini-e2e-local/database.env` holds the local database credential, independent local session secret and safe overrides. Do not paste or commit this file. It disables AI, data/pricing approval, unrelated email/payment providers, bulk mail and Student evidence. The local API port is 5057.

The ignored local launcher `.private/gemini-e2e-local/run-local.cjs` combines the existing backend configuration with these explicit isolated overrides and uses the existing compiled API or worker entry points. It verifies the dedicated database name, owner marker, role and schema before use. No alternative abstract-processing implementation was introduced.

A read-only configuration check, from the project root:

```powershell
node .private/gemini-e2e-local/run-local.cjs check
```

It prints only safe status fields. Both the future `api` and `worker` modes use the same loader and database override. Use this isolated launcher for the controlled test rather than changing the normal development DATABASE_URL. Starting either service requires a separate next step; neither was started during preparation. Existing backend application API key values remain backend-only and are not printed or copied into reports.

## Remaining actions before the external test

1. Correct `ABSTRACT_AI_PRICING_APPROVED_UNTIL` in the existing backend configuration to a future UTC timestamp within 30 days. The current value is present, parses and is loaded correctly, but is beyond the 30-day limit. It was not changed automatically.
2. Create a dedicated fictional local reviewer account in the new database before using Admin login; no existing accounts or password hashes were copied.
3. Confirm the local Admin/public frontend will target the isolated API at `http://localhost:5057`. Their local origins are configured for ports 5174 and 5173. No frontend configuration was changed.
4. Review the empty queue and obtain explicit approval for exactly one fictional submission/live Gemini request. The three AI/data/pricing gates in the private local overrides remain false. No real-author data is approved by this preparation.

Database readiness is complete. External-test activation is not yet ready because the expiry and local reviewer setup remain pending, and no activation permission has been applied.

Evidence: `output/gemini-e2e-local/database-readiness.json`, `output/gemini-e2e-local/application-config-readiness.json`. Both reports exclude passwords, API keys and connection strings.
