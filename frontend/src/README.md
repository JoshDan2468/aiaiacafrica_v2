# Frontend source map

This folder is the website that runs in a visitor's browser.

```text
main.tsx -> App.tsx route -> page -> section/form -> shared component or data/service
```

| Folder        | Plain-language purpose                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `pages/`      | Complete screens attached to browser URLs.                              |
| `components/` | Reusable visual building blocks.                                        |
| `data/`       | Editable conference content and typed records.                          |
| `forms/`      | Form interfaces and validation; several are older, unrouted prototypes. |
| `services/`   | The only browser modules that should communicate with the API.          |
| `hooks/`      | Reusable React/browser behavior.                                        |
| `lib/`        | Small general helpers.                                                  |
| `types/`      | TypeScript descriptions shared by features.                             |
| `test/`       | Shared test setup and cross-feature frontend tests.                     |
| `sections/`   | Older one-page sections not used by the current route tree.             |

Public and attendee routes use feature-specific services for delegate registration, Student
verification, recovery, email verification, payments, Sponsor and Exhibitor applications,
Abstract submissions and Contact enquiries. The separate `admin/` package owns all staff
authentication and operational screens.

For the complete route, file, and data-flow explanation, read
[`../../docs/layman-codebase-guide.md`](../../docs/layman-codebase-guide.md).
