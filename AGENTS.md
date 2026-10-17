# Repository Guidelines

## Project Overview and Structure

This repository is the AIAIAC West Africa conference platform. The public application is a React 19, TypeScript, Vite 8, and Tailwind CSS 4 package in `frontend/`. Public pages live in `frontend/src/pages`, homepage sections in `frontend/src/sections`, reusable/layout UI in `frontend/src/components`, editable content in `frontend/src/data`, and browser API boundaries in `frontend/src/services`. The initial Express and TypeScript API foundation lives in `backend/`. Read `docs/architecture.md` before structural work.

## Architecture and Security Rules

Inspect existing code before modifying it and prefer the smallest safe change. Keep frontend and backend responsibilities separate. UI components must not contain API or business logic; repeated content belongs in typed data modules. Do not create empty folders, fake APIs, or speculative feature code.

Never place secrets, PostgreSQL credentials, or Paystack secret keys in frontend code. Payment initialization and verification must happen on the backend. Treat browser-supplied amounts and payment status as untrusted.

Delegate, sponsor, exhibitor, partner, media-partner, abstract, and general-enquiry flows require separate forms, validation, services, admin handling, and reporting once implemented. Do not expand the temporary shared participation form into a generic production workflow.

Admin APIs must enforce authentication and authorization server-side. `SUPER_ADMIN` owns user, role, and system administration; `ADMIN` receives only explicitly granted operational access. Client-side route guards are presentation only.

## Commands and Coding Standards

Use `npm run dev:frontend` and `npm run dev:backend` from the root. Run `npm run type-check` and `npm run build` for both packages, `npm run test:backend` for API behavior, and `npm --prefix frontend run lint` for frontend ESLint/Prettier checks. Prettier uses double quotes, semicolons, trailing commas, and a 100-character width. Use PascalCase component files, camelCase functions, `useX` hooks, and feature-specific service names.

## Testing and Change Expectations

No automated test framework is configured. For every change, run type checking and the production build; run lint and distinguish pre-existing failures from regressions. When behavior is added, introduce focused tests with that feature instead of creating an empty test hierarchy. Verify affected routes and forms manually. Do not remove working pages, rewrite unrelated UI, or generate speculative backend, payment, database, or admin code.
