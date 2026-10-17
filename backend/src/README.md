# Backend source map

This folder is the API that runs on a server, not in a visitor's browser.

```text
server.ts
  -> app.ts middleware
  -> route
  -> validation/authentication
  -> controller
  -> service
  -> repository
  -> PostgreSQL
```

| Folder          | Plain-language purpose                                          |
| --------------- | --------------------------------------------------------------- |
| `config/`       | Validated settings, PostgreSQL connections, and Admin sessions. |
| `routes/`       | Matches API methods and URLs to handlers.                       |
| `middleware/`   | Security and request/response checkpoints.                      |
| `controllers/`  | Translates HTTP input and output.                               |
| `services/`     | Authentication and password rules.                              |
| `repositories/` | Parameterized SQL and database records.                         |
| `validators/`   | Rules for accepted input.                                       |
| `types/`        | TypeScript descriptions used by backend modules.                |
| `scripts/`      | Deliberately run maintenance/setup commands.                    |
| `email/`        | Provider-neutral transactional email and the Mailjet adapter.   |
| `payments/`     | Provider-neutral payment boundary and Paystack adapter.         |

Health, readiness, Admin authentication, invitation-only staff access, RBAC, Delegate Registration,
and Professional Delegate payment are implemented. The Delegate module owns public package
discovery/submission; payment services own trusted pricing, Paystack confirmation, and
permission-gated Admin monitoring. Campaign tooling and non-delegate workflows are not implemented.

For the complete request flow and file-by-file explanation, read
[`../../docs/layman-codebase-guide.md`](../../docs/layman-codebase-guide.md).
