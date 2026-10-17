# Database migrations

This directory contains deliberate, version-controlled PostgreSQL schema changes managed by
`node-pg-migrate`. The initial authentication migration creates only the `admins` and PostgreSQL
session tables.

Create migrations with descriptive names and implement both `up` and `down` behavior when rollback
is safe. Review generated SQL before applying a migration, and never run down migrations
automatically during application startup.

The migration CLI reads `DATABASE_URL` from `backend/.env`. Use separate databases and credentials
for development, test, and production.
