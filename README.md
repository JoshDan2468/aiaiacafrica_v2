# AIAIAC Conference Platform

The official digital platform for AIAIAC West Africa: Asset Integrity, Artificial
Intelligence, Automation, and Cybersecurity.

Backend Docker Compose setup, Docker Hub releases and InterServer deployment are documented in
[Docker deployment](docs/docker-deployment.md).

## Repository layout

```text
frontend/  React, TypeScript, Vite, and Tailwind public website
backend/   Express and TypeScript API foundation
docs/      Architecture and product documentation
```

The packages are intentionally independent. This repository does not use npm workspaces or a
monorepo framework.

New to the project or to programming? Start with the
[plain-language codebase guide](docs/layman-codebase-guide.md). It explains the vocabulary,
folder layout, browser and server request flows, and the purpose of each project-owned module.

## Install

Requirements: Node.js 20 or newer and npm.

```sh
npm install --prefix frontend
npm install --prefix backend
```

## Run locally

Frontend at `http://localhost:5173`:

```sh
npm run dev:frontend
```

Backend at `http://localhost:5000`:

```sh
copy backend\.env.example backend\.env
npm run dev:backend
```

On macOS or Linux, use `cp backend/.env.example backend/.env` instead.

## Quality checks

```sh
npm run type-check
npm run build
npm run test:backend
npm --prefix frontend run lint
```

Frontend lint currently reports pre-existing formatting issues in legacy source files; TypeScript
and production builds are the required regression checks.

## Initial API

The backend currently exposes liveness and PostgreSQL readiness probes:

```http
GET http://localhost:5000/api/health
GET http://localhost:5000/api/ready
```

`/api/health` confirms that Express can respond and does not depend on PostgreSQL. `/api/ready`
performs a real `SELECT 1;`, returning `200` when PostgreSQL is reachable and a sanitized `503`
when it is not.

Repeatable migrations are configured with `node-pg-migrate` and must be run deliberately from the
backend package. The backend includes PostgreSQL-backed Admin sessions, Argon2id password hashing,
initial Super Admin creation, authentication proof endpoints, and initial role enforcement. See
[Architecture](docs/architecture.md) and [backend/README.md](backend/README.md) for environment,
migration, setup, and Postman instructions.

The React Admin login and dashboard scaffold now include the first real business workflow:
Delegate Registration. Public visitors can submit a Delegate application and Admin/Super Admin
users can view protected list and detail records. Admin account management, reporting data,
payment collection, and non-delegate workflows remain intentionally unimplemented.

Never place PostgreSQL credentials, Paystack secret keys, or other secrets in `frontend/`.

Backend release automation: [Test and production deployment pipeline](docs/deployment-pipeline.md).
# aiaiacafrica_v2
