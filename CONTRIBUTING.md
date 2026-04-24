# Contributing to Playdex

Thanks for stopping by. Contributions, bug reports, and feature ideas are all
welcome. This document covers how the project is laid out and what the bar is
for a merge-ready change.

## Ground rules

- Be respectful. The [Code of Conduct](./CODE_OF_CONDUCT.md) applies in every
  issue, PR, and discussion.
- Playdex is [AGPL-3.0](./LICENSE). By submitting a contribution, you agree it
  ships under the same license.
- Don't post credentials, cookies, or API tokens. Redact before sharing logs.

## Getting set up

**Requirements:** Node 20+, npm 10+.

```bash
git clone https://github.com/SubramanyaGB/playdex.git
cd playdex
npm install

cp .env.example .env
# Generate CREDS_KEY + add STEAM_API_KEY (see README.md)

npx prisma migrate deploy
npx tsx prisma/seed.ts

npm run dev
```

Open http://localhost:3000.

## Project layout

See the [Architecture section](./README.md#architecture) of the README. In
short:

- `app/` — App Router pages + REST endpoints
- `lib/connectors/` — per-store sync logic (Steam, GOG, Epic)
- `lib/cloud/` — cloud-gaming catalog fetchers (GeForce Now, Xbox Cloud)
- `lib/design/` — shared UI primitives, sidebar, chrome, query helpers
- `prisma/` — schema + migrations + seed

## Branching

- `main` is the only long-lived branch.
- Feature branches: `feat/<short-slug>` — e.g. `feat/gog-wishlist-sync`.
- Fix branches: `fix/<short-slug>` — e.g. `fix/steam-achievement-null`.
- Rebase on top of `main` before opening a PR. Avoid merge commits in PR
  branches.

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/). Common
prefixes:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code change without behavior change
- `perf:` performance
- `docs:` README / docs only
- `chore:` tooling, deps, meta
- `test:` tests only

Subject line ≤ 72 chars. Body explains *why*, not *what*.

Example:

```
feat(wishlist): add target-price alert threshold

Allows users to set per-item price floor. Triggers the sale badge
when currentPriceCents < targetPriceCents.
```

## Code conventions

- **TypeScript strict** — no `any` without a `// eslint-disable-next-line` +
  reason. Prefer type-narrowing.
- **Zod** at every network boundary (API route handlers, connector responses).
- Server components by default. Add `"use client"` only when hooks are needed.
- Prisma queries: use the `prisma` singleton from `lib/db.ts` — never
  instantiate a new client.
- Credentials: always encrypt via `lib/crypto.ts` before writing to
  `Account.credsEnc`. Never log them.
- No telemetry, analytics, or phone-home. Playdex is local-first.

## Running checks before a PR

```bash
npm run lint       # ESLint
npx tsc --noEmit   # Typecheck
npm run build      # Production build (catches server/client boundary bugs)
```

CI runs all three on every PR. A green CI is required to merge.

## Adding a new store connector

1. Create `lib/connectors/<store>.ts` matching the `SteamConnector` /
   `EpicConnector` shape: `syncOwned(account)`, `refreshCreds(account)`,
   `getGameMeta(storeGameId)`.
2. Add the store id to `prisma/seed.ts` and re-seed.
3. Add a brand palette entry to `lib/store-meta.ts`.
4. Wire an `app/api/accounts/<store>/` route for the OAuth / API-key flow.
5. Add an onboarding step in `app/onboarding/flow.tsx`.
6. Update the connector table in [README.md](./README.md#features).

## Reporting a bug

Use the [Bug report](./.github/ISSUE_TEMPLATE/bug_report.yml) template.
Include:

- Reproduction steps (exact URLs, store combination, account count).
- Expected vs actual.
- Environment (OS, Node version, `npm list next prisma` output).
- Redacted logs (scrub credentials).

## Requesting a feature

Use the [Feature request](./.github/ISSUE_TEMPLATE/feature_request.yml)
template. Describe the *problem* before the *solution*.

## Pull request checklist

- [ ] Branch rebased on `main`
- [ ] CI green (lint, typecheck, build)
- [ ] Schema changes include a migration (`npx prisma migrate dev --name ...`)
- [ ] Screenshots attached for UI changes
- [ ] Updated README / CONTRIBUTING if behavior or setup changed
- [ ] No committed secrets, no `console.log` left in place
- [ ] Conventional Commit title

## Getting help

Open a [Discussion](https://github.com/SubramanyaGB/playdex/discussions) for
design or architecture questions. Issues are for actionable bugs and concrete
feature requests.
