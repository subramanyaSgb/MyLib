# Mylibrary

> One library across every store you've ever used.

A unified game library for PC + mobile gamers who buy games on multiple stores
*and* multiple accounts per store. Connect Steam, GOG, Epic — see every game
you own in one shelf, with **duplicate detection** as the hero feature.

![status](https://img.shields.io/badge/status-personal--build-orange)
![stack](https://img.shields.io/badge/stack-Next.js%2016%20%2B%20Prisma%207%20%2B%20SQLite-blueviolet)

## Why

Most library managers support one account per store. This one supports many —
because most people have a forgotten alt Steam account from college, a backup
GOG account from the Witcher bundle days, and an Epic account that exists
only because of free games. Mylibrary stitches them all together and tells
you when you bought the same game twice.

## Features

| Feature | Status |
|---------|--------|
| Steam connector — owned games + dev/genre/year + per-game achievements | ✅ |
| GOG connector — OAuth flow + library + v2 metadata enrichment | ✅ |
| Epic Games connector — EGL OAuth + library + Store GraphQL enrichment | ✅ |
| **Multi-account per store** — link as many as you want | ✅ |
| Cross-store duplicate detection (normalized title match) | ✅ |
| Soft-merge — pin a primary copy, hide secondaries from grid | ✅ |
| Manual merge — collapse two canonical games when auto-dedupe misses | ✅ |
| Library: grid + list, search, filters (store, account, played, genre, favorites, hidden) | ✅ |
| Sort: title / recently played / most played / most copies | ✅ |
| Achievements aggregation (Steam) — best-% copy per game | ✅ |
| Procedural cover art with real-cover fallback | ✅ |
| Image proxy + on-disk cache (`.next/img-cache/`) | ✅ |
| Background auto-sync (configurable interval) | ✅ |
| AES-GCM encrypted credentials at rest | ✅ |
| 4-step onboarding flow with hero "second account" moment | ✅ |
| Stove + Google Play connectors | ⏳ Stub |
| Wishlist / Cloud saves / Spend / Family | ⏳ Stub |

## Tech

- **Next.js 16** App Router (Turbopack)
- **React 19**
- **Prisma 7** with split-client + `better-sqlite3` adapter
- **Tailwind 4** + custom design tokens (warm dark editorial)
- **TypeScript** end-to-end
- **Zod** for input validation

No external services. Runs entirely on your machine.

## Getting started

```bash
git clone https://github.com/subramanyaSgb/MyLib.git
cd MyLib
npm install

# Required env (see .env.example below)
cp .env.example .env
# Edit .env — at minimum set CREDS_KEY (32-byte base64) and STEAM_API_KEY

# Database
npx prisma migrate deploy
npx tsx prisma/seed.ts

# Run
npm run dev
```

Open http://localhost:3000

### .env keys

```env
DATABASE_URL="file:./prisma/dev.db"

# 32-byte base64 (run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
CREDS_KEY=""

# https://steamcommunity.com/dev/apikey
STEAM_API_KEY=""

# Background auto-sync threshold in hours (0 = disabled)
AUTOSYNC_HOURS="6"
```

## Connecting accounts

| Store | Auth | Notes |
|-------|------|-------|
| Steam | Public profile + dev API key | Profile must have **Game details: Public** privacy |
| GOG   | OAuth via GOG Galaxy client | Login → paste redirect URL |
| Epic  | OAuth via EGL client | Login → paste authorization JSON |

Tokens are encrypted with `CREDS_KEY` (AES-256-GCM) before storage. Rotating
the key requires re-encrypting all `Account.credsEnc` rows.

## Backfill

When the connectors gain new metadata fields after games are already synced,
hit the backfill endpoint:

```bash
# Steam appdetails + Epic store enrichment + achievements (played only)
curl -X POST http://localhost:3000/api/backfill

# Achievements for unplayed Steam games too
curl -X POST 'http://localhost:3000/api/backfill?onlyAch=1&includeUnplayed=1'

# Drop orphan Game / GameOnStore rows from older sync filters
curl -X POST http://localhost:3000/api/cleanup
```

## Architecture

```
app/
  page.tsx              → Home dashboard
  library/              → Library + grid/list + game detail + merge modals
  duplicates/           → Hero duplicates view
  accounts/             → Linked accounts manager
  achievements/         → Aggregated cross-account achievements
  onboarding/           → 4-step intro flow
  settings/             → Toggles + replay-onboarding
  api/
    accounts/           → CRUD + reauth + sync
    sync-all/           → Parallel sync of every account
    games/[id]/         → Favorite/hide PATCH, consolidate
    games/merge/        → Manual canonical-game merge
    backfill/           → Rich-metadata + achievements backfill
    cleanup/            → Orphan row cleanup
    img/                → Disk-cached image proxy

lib/
  db.ts                 → Prisma client singleton (better-sqlite3 adapter)
  crypto.ts             → AES-GCM encrypt/decrypt for creds
  sync.ts               → Per-store sync orchestration + dedupe
  store-meta.ts         → Brand palette per store
  connectors/
    steam.ts            → ResolveVanityURL, GetOwnedGames, appdetails, achievements
    gog.ts              → OAuth, refresh, library, v2 enrichment
    epic.ts             → OAuth, refresh, library, store GraphQL enrichment
  design/
    cover.tsx           → Procedural cover art (5 styles) + real-cover override
    primitives.tsx      → Icon, StoreDot, Avatar, Chip, Btn, Toggle, PageHeader
    sidebar.tsx         → App shell sidebar with libraries tree
    top-chrome.tsx      → Sticky search + last-sync indicator
    derived.ts          → Server-side query helpers
    routes.ts, store-meta proxy, etc.

prisma/
  schema.prisma         → Account, Game, GameOnStore, OwnedCopy
  seed.ts               → Stores table seed
```

## Schema

```
Store          steam, epic, gog, stove, play
Account        many per Store. Encrypted creds + label/handle/avatar.
Game           canonical title (dedup by normalized title).
                + dev / genre / releaseYear / tagsJson / cover
                + isFavorite / isHidden / mergedPrimaryAccountId
GameOnStore    Game × Store. storeGameId (Steam appid, GOG productId, Epic catalogItemId).
OwnedCopy      Account × GameOnStore. playtime, lastPlayed, achievements N/M.
```

## Status

Personal-build, **not production**. Ships with a single-user assumption (no
auth on the app itself). Run locally only.

## License

Personal use. Do not redeploy as a public service without rotating all
embedded OAuth client secrets used by the GOG/Epic connectors (those are
the public Galaxy / Launcher client IDs, intended for desktop clients).
