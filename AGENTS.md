# Repository Guide

## Required Workflow
- Inspect referenced files and related code before editing; trust scripts/config over prose.
- Before editing, state affected files, requirements, and exit criteria.
- Keep changes scoped and preserve the existing architecture.
- Validate required/obsolete/duplicate files, all references, docs links, generated artifacts, and the explicit `TODO|FIXME` count. Repair and rerun the whole checklist until it passes.
- After validation, update exactly one relevant `CHANGELOG.md` entry (`docs/CHANGELOG.md` for app-wide work) using current `git branch --show-current`, `git rev-parse --short HEAD`, `git diff --name-only`, `git diff HEAD`, and `git log --oneline`. Preserve history and use its existing `# YY` / `## DDMM` / `### HHMM` table format with author `Tea`.
- Do not report completion before validation and changelog work are complete.

## Boundaries
- This repository contains two independently installed/deployed apps: `frontend/` (React SPA) and `backend/` (Express/Prisma API). Run npm commands from the owning app directory; there is no root package manifest.
- Backend wiring starts at `server.js` -> `app.js` -> `routes/` -> `controllers/`; service-like code lives in `utils/`, not a `services/` directory.
- Frontend routing starts in `src/App.tsx`; network contracts are RTK Query endpoints under `src/redux/api/`; pages live under `src/views/`.
- `Listing` is the legacy rental model. `Accommodation`/`Room` is a separate stays subsystem; do not reuse its types or amenity categories for listing behavior.

## Commands
- Backend focused test: `node --test tests/<file>.test.js`; full unit suite: `npm run test:unit`.
- Backend E2E requires PostgreSQL plus migrations and direct seed; CI order is `npm ci`, `npx prisma generate --schema=prisma/schema.prisma`, `npx prisma migrate deploy --schema=prisma/schema.prisma`, `npm run seed:db`, start port 5000, then `npm run test:e2e`. Use `PAYMENT_PROVIDER=mock` and `SMS_PROVIDER=mock`.
- After Prisma schema changes run `npx prisma validate`, `npx prisma generate`, and migration-backed tests; never edit generated Prisma client files.
- Frontend focused test: `npm test -- --watchAll=false --runTestsByPath <path>`; strict check: `npx tsc --noEmit`; production verification: `npm run build`.
- Frontend scripts require Node's legacy OpenSSL flag through CRA; use package scripts rather than invoking `react-scripts` directly.

## Gotchas
- API response shapes are not uniform: verify the mounted route/controller before typing RTK Query responses. Many records add Mongo-compatible `_id` while Prisma stores `id`; HTTP 204 responses have no JSON body.
- Listing lifecycle expiration uses `status: "expired"` and `expiresAt`; `inactive` and `paymentDeadline` are different states/concepts.
- Legacy listing categories are derived: Student is `studentAccommodation: true`; ordinary Rent is `false`. `Listing.type` is validated as `rent`, so do not query `type=student`.
- Public listing queries sanitize address/contact fields. Owner/admin management queries intentionally return hidden statuses; keep ownership checks on landlord routes.
- `NODE_ENV=test` suppresses backend cron jobs. The CI E2E database is PostgreSQL 16 and Node 20.
- Root `amplify.yml` is a monorepo descriptor; each app's own `amplify.yml` governs its actual build. Frontend artifacts are `build/`; backend deployment must run Prisma generation/migrations first.
