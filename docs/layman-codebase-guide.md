# AIAIAC codebase guide in plain language

This guide is the starting point for a reader who is new to software development. It explains
what each part of the repository is for, how the parts communicate, and which features are real,
mocked, or still waiting to be built.

It deliberately explains project-owned code instead of commenting every line. Comments that only
repeat the code quickly become noise and can become incorrect when code changes.

## 1. What this project is

The repository contains two separate programs:

```text
Person's browser                         AIAIAC server
----------------                         -------------
frontend/ (React website)  -- HTTP -->   backend/ (Express API)  --> PostgreSQL
```

- `frontend/` is the website people see and interact with.
- `backend/` receives network requests, applies security rules, and talks to PostgreSQL.
- `docs/` explains product and engineering decisions.
- The root `package.json` provides convenient commands that run either package.

The packages have their own dependencies and build settings. They are stored together, but they
are installed, built, and deployed independently.

## 2. A small vocabulary

| Word       | Plain-language meaning                                                                 |
| ---------- | -------------------------------------------------------------------------------------- |
| Component  | A reusable piece of a web page, such as a button, header, or speaker card.             |
| Page       | A component attached to a browser address such as `/about`.                            |
| Section    | One visual region inside a page, such as its hero or gallery.                          |
| Props      | Values a parent component passes to a child component.                                 |
| State      | Information a component remembers while the page is open.                              |
| Hook       | A React helper whose name begins with `use`, usually for state or browser behavior.    |
| Context    | Shared React state available to many components without passing it through each level. |
| Route      | A browser URL or server URL connected to code that handles it.                         |
| API        | The agreed set of server URLs and JSON messages used by the frontend.                  |
| Middleware | A server checkpoint that runs before or after a route handler.                         |
| Controller | Server code that translates an HTTP request into a service call and HTTP response.     |
| Service    | Code that owns an operation or business rule.                                          |
| Repository | Code that reads or writes database records.                                            |
| Schema     | Rules describing which values are valid.                                               |
| Migration  | A version-controlled change to the database structure.                                 |
| Type       | A TypeScript description of the shape of a value. It disappears after compilation.     |
| Mock       | A temporary imitation used while the real backend operation does not exist.            |

## 3. Start reading here

For the public website, follow this order:

1. `frontend/src/main.tsx` places React into `frontend/index.html`.
2. `frontend/src/App.tsx` maps browser URLs to page components.
3. Open one page, for example `frontend/src/pages/public/home/HomePage.tsx`.
4. Follow the page's imports to its sections and then to `frontend/src/data/`.
5. Read `frontend/src/components/` only when a page uses a shared visual building block.

For the API, follow this order:

1. `backend/src/server.ts` starts the HTTP server.
2. `backend/src/app.ts` assembles security, sessions, routes, and error handling.
3. `backend/src/routes/` maps API URLs to controllers and middleware.
4. `backend/src/controllers/` reads requests and creates responses.
5. `backend/src/services/` applies authentication rules.
6. `backend/src/repositories/` performs SQL queries.

## 4. What happens when the website opens

```text
frontend/index.html
  -> frontend/src/main.tsx
  -> frontend/src/App.tsx
  -> matching *Page.tsx
  -> page sections
  -> shared components and editable data
```

`App.tsx` also wraps the application in `AuthProvider`. On startup, that provider asks the API
whether an Admin session already exists. A failed Admin session check does not stop public pages
from loading.

The route table currently exposes:

| Browser address           | Page                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `/`                       | Public homepage                                               |
| `/about`                  | About AIAIAC                                                  |
| `/conferences`            | Conference information and archive                            |
| `/speakers`               | Speaker directory and archive                                 |
| `/exhibition`             | Exhibitor information                                         |
| `/registration`           | Client-only registration preparation experience               |
| `/registration/delegate`  | Opens the same registration page at the delegate journey      |
| `/registration/exhibitor` | Opens the same page at the exhibitor journey                  |
| `/registration/sponsor`   | Opens the same page at the sponsorship journey                |
| `/sponsorship`            | Sponsor information                                           |
| `/media`                  | Media gallery                                                 |
| `/contact`                | Locally prepares an email for the visitor's email application |
| `/admin/login`            | Admin sign-in                                                 |
| `/admin/dashboard`        | Protected Admin dashboard scaffold                            |
| any unknown address       | Not-found page                                                |

## 5. What happens during Admin login

```text
LoginFormSection
  -> AuthContext.login
  -> services/auth/authService.ts
  -> services/api/client.ts
  -> POST /api/auth/login
  -> login rate limiter
  -> auth controller
  -> auth service
  -> Admin repository
  -> PostgreSQL
  -> session cookie returned to the browser
```

The cookie is HttpOnly, so frontend JavaScript cannot read it. The browser attaches it to later
requests because `apiRequest` uses `credentials: "include"`. `ProtectedRoute` improves the user
experience by hiding Admin pages in the browser, but the backend middleware is the real security
boundary.

## 6. What is live and what is a prototype

| Area                                     | Current behavior                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Public content pages                     | Render from local TypeScript data and image files.                                       |
| Contact form                             | Validates locally, then creates a `mailto:` link. The website does not send or store it. |
| Registration experience                  | Collects and reviews values only in browser memory. It does not save, book, or charge.   |
| `apiRequest` in `services/api/client.ts` | Makes real HTTP requests and is used by Admin authentication.                            |
| `apiPost` in the same file               | Returns a fake success while `USE_MOCK` is `true`.                                       |
| Admin authentication API                 | Real, backed by PostgreSQL sessions and Admin records.                                   |
| Admin dashboard figures                  | Placeholder presentation values, not reporting data.                                     |
| Payments and registration APIs           | Not implemented.                                                                         |

Do not turn off `USE_MOCK` expecting registration to work: the backend has no `/registrations`
route. Payment amounts and success must eventually be created and verified by backend code.

## 7. Repository root

| File or folder                     | Purpose                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `README.md`                        | Setup, run, build, test, and security overview.                              |
| `AGENTS.md`                        | Rules for people or coding agents changing this repository.                  |
| `package.json`                     | Shortcuts for running commands in the two packages.                          |
| `docs/architecture.md`             | Technical boundaries and approved architecture.                              |
| `docs/product-design-brief.md`     | Detailed content and design direction for the website.                       |
| `docs/README.md`                   | Database migration notes.                                                    |
| `frontend/`                        | Browser application.                                                         |
| `backend/`                         | Server application.                                                          |
| `frontend/dist.zip`, `backend.zip` | Archived build/source artifacts; they do not run as part of the source tree. |
| `({name`                           | Empty file with no runtime role.                                             |

## 8. Frontend map

The nearby `frontend/src/README.md` is a shorter folder map intended to be read while browsing the
frontend source.

### Frontend setup files

| File                        | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `frontend/index.html`       | The one HTML shell. React mounts into its `root` element.                     |
| `frontend/src/main.tsx`     | Browser entry point.                                                          |
| `frontend/src/App.tsx`      | Central route table and top-level providers.                                  |
| `frontend/src/styles.css`   | Tailwind setup, theme tokens, fonts, global styles, and shared CSS utilities. |
| `frontend/vite.config.ts`   | Vite, React, Tailwind, import alias, and frontend test configuration.         |
| `frontend/tsconfig.json`    | Strict TypeScript rules and the `@/` alias for `frontend/src/`.               |
| `frontend/eslint.config.js` | Linting and formatting rules.                                                 |
| `frontend/components.json`  | shadcn component generator configuration.                                     |
| `frontend/.env.example`     | Documents safe public frontend environment variables.                         |

### Public pages

Every `*Page.tsx` is the page-level organizer. Its sibling `*Section.tsx` files are displayed in
the order imported by that page.

| Folder                      | Files and responsibility                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/public/home/`        | `HomePage` composes the home hero, overview, conference focus, keynote speakers, speaker and sponsor archives, exhibition invitation, video, media archive, chairman message, and participation call to action. |
| `pages/public/about/`       | `AboutPage` composes the hero, purpose, vision, pillars, audience, regional/global context, organiser, importance, and join sections.                                                                           |
| `pages/public/conferences/` | `ConferencesPage` composes the hero, subject focus, archive, and contribution call to action.                                                                                                                   |
| `pages/public/speakers/`    | `SpeakersPage` composes the hero, speaker directory, keynote archive, and participation call to action.                                                                                                         |
| `pages/public/exhibition/`  | `ExhibitionPage` composes the hero, opportunity, reasons to exhibit, and enquiry call to action.                                                                                                                |
| `pages/public/sponsorship/` | `SponsorshipPage` composes the hero, partnership value, partner archive, and enquiry call to action.                                                                                                            |
| `pages/public/media/`       | `MediaPage` composes the hero, gallery, and participation call to action.                                                                                                                                       |
| `pages/public/contact/`     | `ContactPage` composes the hero, contact details, email-preparation form, and closing section. `contactFormSchema.ts` validates the form and the test verifies that no network submission occurs.               |

### Registration pages

| Folder or file                                         | Responsibility                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `pages/registration/registration/RegistrationPage.tsx` | The routed registration page. It opens and closes the registration dialog and restores keyboard focus.          |
| `RegistrationExperience.tsx`                           | The large client-only multi-step package, details, review, and handoff dialog. Values live only in React state. |
| `OptionsSection.tsx`                                   | Displays the available participation routes.                                                                    |
| `DownloadCentreSection.tsx`                            | Shows document-download placeholders/links.                                                                     |
| `HeroSection.tsx`                                      | Registration page introduction.                                                                                 |
| `pages/registration/flow/`                             | Older category-specific form composition. It is not imported by `App.tsx`.                                      |
| `pages/registration/register/`                         | Older shared participation route. It is not imported by `App.tsx`.                                              |

### Admin and system pages

| Folder                    | Responsibility                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pages/admin/login/`      | `AdminLoginPage` controls redirects; `LoginFormSection` handles input and errors; `BrandingSection` supplies the visual identity. |
| `pages/admin/dashboard/`  | `AdminDashboardPage` composes overview, placeholder summaries, system status, and workspace sections.                             |
| `pages/system/not-found/` | Page and section shown for an unknown browser URL.                                                                                |

### Shared frontend components

| Folder                     | Responsibility                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/layout/`       | Public header, footer, page wrapper, and reusable page hero. `PublicPageLayout` also updates browser metadata.                                               |
| `components/common/`       | Shared buttons, headings, calls to action, media display, and motion/reveal effects.                                                                         |
| `components/admin/`        | Admin navigation, loading state, top bar, sidebar, and browser-side protected-route wrapper.                                                                 |
| `components/speakers/`     | Reusable speaker card and looping speaker list.                                                                                                              |
| `components/partners/`     | Reusable looping partner-logo list.                                                                                                                          |
| `components/registration/` | Reusable registration option card.                                                                                                                           |
| `components/ui/`           | Generated/adapted shadcn and Radix primitives such as button, dialog, input, table, tabs, tooltip, and sidebar. Treat these as the low-level design toolkit. |

The filename inside `components/ui/` names the control it supplies. For example, `dialog.tsx`
contains dialog building blocks, `select.tsx` contains select-menu building blocks, and
`sidebar.tsx` contains the full sidebar toolkit. These files are infrastructure, not conference
business logic.

### Frontend data, forms, and behavior

| Folder or file                                 | Responsibility                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `data/event.ts`                                | Active event edition, dates, venue, and status.                                           |
| `data/conference.ts`                           | Conference identity, focus areas, and headline figures.                                   |
| `data/about.ts`                                | About-page statements, pillars, audience groups, and organiser content.                   |
| `data/navigation.ts`                           | Public navigation links.                                                                  |
| `data/adminNavigation.ts`                      | Admin sidebar navigation groups.                                                          |
| `data/speakers.ts`                             | Speaker and keynote records.                                                              |
| `data/sponsors.ts`                             | Sponsor/partner logo records.                                                             |
| `data/committee.ts`                            | Committee-member records.                                                                 |
| `data/programme.ts`                            | Draft conference schedule; placeholder entries are explicitly marked.                     |
| `data/media.ts`                                | Gallery image records and captions.                                                       |
| `data/contact.ts`                              | Public email, phone, address, and enquiry choices.                                        |
| `data/registration.ts`                         | Registration categories, prototype journeys, package labels, and unconfirmed price state. |
| `data/AIAC_images/`                            | Local conference photography used by content modules.                                     |
| `forms/common/RegistrationFlowForm.tsx`        | Older shared local validation form. It does not send data.                                |
| `forms/delegate/`                              | Older delegate form and its Zod validation rules.                                         |
| `forms/exhibitor/`                             | Older exhibitor form and its Zod validation rules.                                        |
| `forms/sponsor/`                               | Older sponsor form and its Zod validation rules.                                          |
| `forms/participation/`                         | Transitional form that calls the mocked registration service.                             |
| `services/api/client.ts`                       | Shared browser HTTP behavior and friendly network error messages.                         |
| `services/auth/authService.ts`                 | Login, current-session, and logout calls.                                                 |
| `services/registration/registrationService.ts` | Validates registration input and currently reaches the mock `apiPost` boundary.           |
| `context/AuthContext.tsx`                      | Loads and stores the current Admin for the React application.                             |
| `context/authContextValue.ts`                  | Defines the context's value and creates the context object.                               |
| `hooks/useAuth.ts`                             | Safe shortcut for reading authentication context.                                         |
| `hooks/useCountdown.ts`                        | Calculates time remaining until a date.                                                   |
| `hooks/useReducedMotion.ts`                    | Detects the visitor's reduced-motion accessibility preference.                            |
| `hooks/use-mobile.tsx`                         | Detects whether the browser is below the mobile breakpoint.                               |
| `lib/utils.ts`                                 | Merges conditional Tailwind class names.                                                  |
| `lib/adminProfile.ts`                          | Produces an Admin first name and initials for display.                                    |
| `types/index.ts`                               | Shared public-site data shapes.                                                           |
| `types/auth.ts`                                | Frontend authentication data and result shapes.                                           |
| `test/setupTests.ts`                           | Shared browser-test setup and cleanup.                                                    |
| `test/adminAuth.test.tsx`                      | Admin login, redirect, session, and logout behavior tests.                                |

### Older top-level sections

`frontend/src/sections/` contains an earlier one-page version of the conference site: `Hero`,
`About`, `Committee`, `Countdown`, `Invitation`, `Media`, `Participate`, `Programme`, and
`Speakers`. None is imported by the current `App.tsx` route tree. Check usage before changing or
deleting them because they may be retained for comparison or future migration.

## 9. Backend map

The nearby `backend/src/README.md` is a shorter request-flow map intended to be read while
browsing backend source.

### Startup and configuration

| File                    | Purpose                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `backend/src/server.ts` | Starts the server and closes HTTP/database resources on shutdown.                                                        |
| `backend/src/app.ts`    | Assembles middleware, dependencies, sessions, and API routers. It can also create a smaller database-free app for tests. |
| `config/env.ts`         | Reads `.env`, validates values, supplies defaults, and refuses unsafe production configuration.                          |
| `config/database.ts`    | Lazily creates the PostgreSQL connection pool, checks readiness, and closes it.                                          |
| `config/session.ts`     | Stores Admin sessions in PostgreSQL and configures the secure cookie.                                                    |

Never expose the backend `.env` file or copy its secret values into frontend code. The example
file documents variable names; the real file contains local secrets.

### Routes and controllers

| File                               | Purpose                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `routes/index.ts`                  | Top-level `/api` router for health, readiness, authentication, and Admin routes.             |
| `routes/auth.routes.ts`            | Maps login, current Admin, and logout URLs to their checkpoints.                             |
| `routes/admin.routes.ts`           | Contains proof endpoints for authenticated and Super Admin access.                           |
| `controllers/health.controller.ts` | Returns a simple response proving the Express process is alive.                              |
| `controllers/ready.controller.ts`  | Checks PostgreSQL and reports whether the service is ready for traffic.                      |
| `controllers/auth.controller.ts`   | Validates login input, rotates/saves/destroys sessions, and shapes authentication responses. |

### Authentication and database access

| File                               | Purpose                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `services/auth.service.ts`         | Checks credentials without revealing whether an email exists and returns safe Admin data. |
| `services/password.service.ts`     | Hashes and verifies passwords with Argon2id.                                              |
| `repositories/admin.repository.ts` | Parameterized SQL for finding and creating Admin records.                                 |
| `validators/auth.validator.ts`     | Normalizes emails and validates login and first-Super-Admin input.                        |
| `types/admin.ts`                   | Backend Admin record, safe profile, status, and role shapes.                              |
| `types/express-session.d.ts`       | Teaches TypeScript that an Admin ID may exist in an Express session.                      |

### Middleware

Express runs middleware in the order registered in `app.ts`.

| File                                      | Purpose                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `middleware/requestLogger.middleware.ts`  | Logs method, path, status, and duration in development without logging sensitive bodies. |
| `middleware/loginRateLimit.middleware.ts` | Temporarily blocks an IP after too many failed login attempts.                           |
| `middleware/requireAuth.middleware.ts`    | Requires a session and reloads the Admin to reject deleted or disabled accounts.         |
| `middleware/requireRole.middleware.ts`    | Allows only explicitly listed roles after authentication.                                |
| `middleware/notFound.middleware.ts`       | Creates a predictable JSON 404 for unmatched routes.                                     |
| `middleware/error.middleware.ts`          | Converts expected and unexpected errors into sanitized JSON responses.                   |

### Database setup, scripts, and tests

| File or folder                                                 | Purpose                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `backend/migrations/20260820060315610_admin-authentication.ts` | Creates/drops the `admins` and session tables in a deliberate migration.                        |
| `backend/src/scripts/create-super-admin.ts`                    | One-time command that validates temporary environment values and creates the first Super Admin. |
| `backend/test/app.test.ts`                                     | Health, readiness, 404, body-size, CORS, and error-response tests.                              |
| `backend/test/auth.test.ts`                                    | Login, logout, session, role, rate-limit, and authentication behavior tests.                    |
| `backend/test/env.test.ts`                                     | Environment validation and default-value tests.                                                 |
| `backend/migration.config.json`                                | Tells the migration tool where migrations and migration history live.                           |
| `backend/tsconfig.json`                                        | TypeScript settings for production server code.                                                 |
| `backend/tsconfig.test.json`                                   | TypeScript settings that also cover tests.                                                      |
| `backend/.env.example`                                         | Safe template for backend configuration names.                                                  |

## 10. Common changes and where to make them

| Goal                             | Start here                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Change conference dates or venue | `frontend/src/data/event.ts`                                                         |
| Change public navigation         | `frontend/src/data/navigation.ts`                                                    |
| Add or edit a speaker            | `frontend/src/data/speakers.ts`                                                      |
| Change a page's wording or order | Its `*Page.tsx`, sibling section, or matching `data/` file                           |
| Add a public browser URL         | `frontend/src/App.tsx`, then add a page folder                                       |
| Change a shared visual control   | `frontend/src/components/`; use `components/ui/` only for low-level primitives       |
| Change friendly API errors       | `frontend/src/services/api/client.ts` or the feature service                         |
| Add an API URL                   | Backend route, validation/auth middleware, controller, service, repository as needed |
| Change login rules               | Backend validator/service/controller plus focused tests                              |
| Change database structure        | Add a reviewed migration; never create tables during server startup                  |

## 11. Safety rules a beginner should remember

- Do not put passwords, database URLs, session secrets, or Paystack secret keys in `frontend/`.
- Do not trust a price, role, or payment-success value sent by a browser.
- Do not treat `ProtectedRoute.tsx` as security; backend authentication and role middleware are
  required.
- Do not combine the separate delegate, exhibitor, sponsor, partner, media, abstract, and general
  enquiry workflows into one production form.
- Do not edit generated build folders or ZIP archives as source code.
- Search for imports before deleting code that appears unused.
- After a code change, run `npm run type-check` and `npm run build` from the repository root.

## 12. How to keep this guide accurate

Update this guide when a route, source folder, request flow, or implementation status changes.
Small visual or wording changes normally do not require a guide update. When a prototype becomes a
real submission flow, update both section 6 and the relevant file map in the same change.
