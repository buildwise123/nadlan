# Nadlan · Milwaukee Real Estate Analyzer

A personal, single-user web app for finding, enriching and analyzing residential
real estate deals in the City of Milwaukee, WI. The full specification (in Hebrew)
lives in the project's Claude Doc; this README covers how to run and maintain the code.

**Status:** Phase 1 (infrastructure). The screens are placeholders; business
features arrive in phases 2–6.

## Stack

| Part | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind CSS 4 |
| Login | next-auth v4, GitHub OAuth, one allowed GitHub user id |
| Data | Airtable (bases `nadlan` and `nadlan-test`) |
| Hosting | Vercel (Hobby) |
| Scheduled jobs | Apify Actor (phase 5) |
| Tests | Vitest + MSW (unit), Playwright (end-to-end) |
| CI | GitHub Actions: lint, typecheck, unit, build, e2e, gitleaks |

## Setup from scratch

Requirements: macOS or Linux, Node.js 24+ (developed on 26), Git.

```bash
git clone https://github.com/buildwise123/nadlan.git
cd nadlan
npm ci
cp .env.example .env.local   # then fill in the values (see below)
```

Fill `.env.local` (never commit it; Git ignores it):

| Variable | Where it comes from |
| --- | --- |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `http://localhost:3000/api/auth/callback/github` (local) or `https://<site>/api/auth/callback/github` (Vercel; a second OAuth App) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally; the site URL on Vercel |
| `ALLOWED_GITHUB_USER_ID` | Numeric id of the one allowed account: `gh api user --jq .id` |
| `AIRTABLE_TOKEN` | airtable.com/create/tokens. Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`, `schema.bases:write`; access: the `nadlan` workspace only |
| `AIRTABLE_WORKSPACE_ID` | The `wsp…` id in the workspace URL |
| `AIRTABLE_BASE_ID`, `AIRTABLE_TEST_BASE_ID` | Printed by the setup script below |

Create the Airtable bases (safe to run again; it only adds what is missing):

```bash
npm run airtable:setup -- --base nadlan-test --dry-run   # show the plan
npm run airtable:setup -- --base nadlan-test             # create/complete the test base
npm run airtable:setup -- --base nadlan                  # create/complete the real base
```

Paste the printed base ids into `.env.local`, then:

```bash
npm run dev        # http://localhost:3000
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright; needs a build first, and `npx playwright install chromium` once) |
| `npm run airtable:setup -- --base <name> [--dry-run]` | Create or complete an Airtable base from the schema |

## Project structure

```
src/
  app/                 Pages and API routes
    (app)/             Signed-in area: dashboard, deals, analysis, compare, status
    login/             Login page
    api/auth/          next-auth handler
    api/health/        Public liveness check
    api/status/        Protected system status (settings present, Airtable reachable)
  lib/
    env.ts             Per-feature validation of environment variables
    logger.ts          pino JSON logger with secret redaction
    auth.ts            next-auth options, getSession()
    auth-rules.ts      Pure access rules (who may in, which paths are public)
    airtable/          Client (rate limit, retries), schema as code, setup planner
    sync-runs.ts       Durable run log in the "Sync Runs" table
    status.ts          System checks for the status page
  proxy.ts             Route protection (Next.js 16 "proxy", formerly middleware)
scripts/               Command-line scripts (Airtable setup)
e2e/                   Playwright tests
.github/workflows/     CI
```

## Security rules

- Secrets live only in `.env.local` (local) and Vercel/Apify settings (cloud). Never in Git, chat or docs.
- `.env.example` lists variable names without values.
- Every page and API route requires login except `/login`, `/api/auth/*` and `/api/health`.
  The proxy checks the session cookie; API routes check the session again.
- Only one GitHub account (by numeric id) can sign in.
- Logs redact secret-looking keys and mask secret values inside messages.
- CI runs gitleaks on every push.

## Logs

- Runtime logs: JSON lines via pino (`LOG_LEVEL`, default `info`). Vercel Hobby keeps them one hour.
- Durable log: each job run writes a row to the Airtable table **Sync Runs**
  (status, counts, first 20 errors, API calls used).

## Technical decisions

- **Next.js 16 proxy** replaces middleware; it runs on the Node.js runtime.
- **Cache Components and Partial Prefetching are off.** Every page reads the session and live
  Airtable data, so the static-shell model adds complexity with no benefit for one user.
- **next-auth v4** (stable) rather than Auth.js v5 (still beta in Nov 2026). Decision P1-2.
- **TypeScript 5.9** rather than 7.0. Decision P1-3.
- **Airtable schema as code** (`src/lib/airtable/schema.ts`): only API-creatable field types.
  Values the spec describes as formulas or lookups are plain fields our code fills in.
  The setup script is additive: it never deletes or changes existing fields.
- **Airtable rate limit:** requests are spaced 200 ms apart; on HTTP 429 the client waits 30 s.

## Tests

- Unit tests sit next to the code (`*.test.ts`); external APIs are mocked with MSW.
- End-to-end tests run against a production build with test-only settings. They sign in by
  minting a session cookie with a throwaway secret, so no GitHub account is needed.
