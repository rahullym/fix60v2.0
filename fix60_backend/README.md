# Fix60 backend

Home assistance and local services marketplace: API, database and shared contracts.
Scope, open client questions and milestones: [docs/plan/phase1-plan.md](docs/plan/phase1-plan.md).

| Path                                                   | What                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `apps/api`                                             | NestJS REST API at `/api/v1`. Sole database consumer.                  |
| `packages/db`                                          | Drizzle schema, SQL migrations (PostGIS + btree_gist), idempotent seed |
| `packages/shared`                                      | Zod request/response/env contracts shared with the web and mobile apps |
| `packages/eslint-config`, `packages/typescript-config` | Tooling                                                                |

## Local setup

Requires Node 24, pnpm 10 and Docker.

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d --wait     # PostGIS on 127.0.0.1:5446
cp apps/api/.env.example apps/api/.env                     # then set JWT_SECRET and ADMIN_TOTP_ENCRYPTION_KEY

export DATABASE_URL=postgres://fix60:fix60@127.0.0.1:5446/fix60
pnpm db:migrate
SEED_SUPER_ADMIN_EMAIL=you@example.com SEED_SUPER_ADMIN_PASSWORD='a-long-passphrase' pnpm db:seed

pnpm --filter @fix60/shared build && pnpm --filter @fix60/db build
pnpm --filter @fix60/api dev                               # http://localhost:4000/api/v1/health
```

The seed creates the organisation row, the four system admin roles, Kerala's 14 districts and the initial service catalog with its wizard questions and required documents. It is safe to re-run.

### Signing in locally

- **App users:** with `AUTH_ALLOW_DEV_TOKENS=true`, send `dev:+919876543210` as the Firebase `idToken` to `POST /auth/firebase` and `POST /auth/register`. This is refused when `NODE_ENV=production`.
- **Admins:** `POST /admin/auth/login` with the seeded email and password. The first login returns a TOTP secret and `otpauth://` URL to add to an authenticator app. Confirm it with `POST /admin/auth/totp`.

## Commands

| Command                                                                    | Does                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm typecheck` / `pnpm lint` / `pnpm test`                               | Whole workspace (typecheck also runs on `git push`)                                      |
| `pnpm db:generate`                                                         | New migration from schema changes (also fixes drizzle-kit's quoting of the PostGIS type) |
| `pnpm db:migrate` / `pnpm db:seed`                                         | Apply migrations / reference data to `DATABASE_URL`                                      |
| `pnpm --filter @fix60/db exec drizzle-kit generate --custom --name <name>` | Hand-written SQL migration (constraints Drizzle cannot express)                          |

## Security model (API)

- **Deny by default.** Every route declares `@Public()`, `@UserAccess(...roles)` or `@AdminAccess(...permissions)`. An undeclared route returns 403.
- **Live checks.** Access tokens are short-lived JWTs whose audience separates app and admin tokens. Every request reloads account status and admin permissions, so suspensions and role changes apply immediately.
- **Refresh tokens.** Refresh tokens are opaque and stored hashed. They rotate on every use; replaying an old one revokes the whole session family.
- **Admin login.** Admins sign in with bcrypt password + TOTP. TOTP codes can't be replayed. Five failures lock the account for 15 minutes. Admins can't grant permissions they don't hold, and the last Super Admin can't be removed.
- **Audit log.** Every privileged change writes an audit entry in the same transaction. Diffs are redacted (no secrets or storage keys; phones and emails masked). A trigger makes `audit_logs` append-only.
- **Database guarantees.** An EXCLUDE constraint rejects overlapping active bookings for a provider. A CHECK constraint rejects provider birth dates under 18.
- **Storage.** Storage is private. Reads and uploads use short-lived signed URLs.

## Deployment

`Dockerfile` builds the API image (non-root, `GIT_SHA` baked in). `.github/workflows/deploy-api-production.yml` builds it on `main`, copies it to the host, runs migrations inside the image and restarts `docker-compose.prod.yml`. Secrets stay in `shared/.env` on the host.

Requirements:

- Repository secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `EC2_APP_PATH`.
- A managed Postgres 16 with the `postgis` and `btree_gist` extensions available.

The production env must set `NODE_ENV=production`. The API refuses to start with dev tokens enabled or admin TOTP disabled.
