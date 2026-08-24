# CLAUDE.md

Guidance for working in this repo.

## What this is

A dashboard that tracks adoption of a Mina protocol hardfork upgrade across the
network. Nodes report their stats; the dashboard shows which block producers
have upgraded and how much active stake has moved to an upgraded commit.

Live: https://devnet-status.gcp.o1test.net/

## Stack & layout

- **Express + TypeScript + Prisma (PostgreSQL)**. Server-rendered HTML — no SPA.
- Request flow: `src/routes/*` → `src/services/*` → `src/repositories/*` → Prisma (`src/db.ts`).
- The entire dashboard page (HTML + CSS + client JS) is one big template string in
  **`src/templates.ts`** (`renderDashboard`). There's no separate asset pipeline.
- Prisma models (`prisma/schema.prisma`): `NodeStats` (one row per `peer_id`),
  `BlockProducer`, `ValidCommit`, `SyncMetadata`. Prisma client is generated into
  `src/generated/prisma` (gitignored-ish; do not hand-edit).

## Domain rules you must keep in mind

- **Stake percentages are stored as fractions in [0,1].** The uploaded staking-ledger
  CSV is on a 0–100 scale, so `blockProducerService.parseCSV`
  (`src/services/block-producer-service.ts`) divides `percent_total_*` by 100 at
  ingestion. Everything downstream (stake math + the `*100` rendering) assumes 0–1.
- **A node is "upgraded"** if its `commit_hash` is in the `valid_commits` table
  (`src/utils/upgrade-check.ts`, cached 60s).
- **The dashboard table shows one row per block producer, not per node.** A node
  that restarts with a new commit reports under a new `peer_id`, leaving its old
  record in the DB. Grouping is done in **`src/services/block-producer-rows.ts`**:
  - `groupByBlockProducer` folds node records by BP key → upgraded if **any** node
    is upgraded; `commits` = distinct list (first-seen order); peer/timestamp from
    the **most recent** report; block height = **max**; nodes with **no BP key are
    dropped** (still kept in the DB for potential future use).
  - **`SHOW_NON_BP_NODES=true`** flips that last rule: keyless nodes are admitted
    as one row each, keyed by `peer_id` (no BP key means no restart-folding, so a
    restart under a new peer_id becomes a new row). That is why
    `BlockProducerRow.block_producer_public_key` is `string | null`. Intended for
    networks where o1Labs runs no block producers of its own — on mainnet the
    fleet is archive + seeds, so the default view is permanently empty. With the
    flag on the count cards read "Nodes" instead of "Block Producers".
  - `computeStakeStats` sums stake over those unique rows (so the cards and the
    table can never disagree). Keyless rows carry null stake fields and a null
    `is_active` (nulled by `groupByBlockProducer` itself, not by the caller), so
    they contribute nothing and the stake gate stays block-producer-only
    regardless of `SHOW_NON_BP_NODES`. Keep it that way.
  - When **no** row has a BP key, `renderDashboard` renders the stake figures as
    an em dash with an explanatory note, and the donut as a single neutral slice
    — a literal `0.00%` there reads as "nothing upgraded" rather than "no stake
    is being measured".
- **Commits column** (`src/templates.ts`): shows the first 2 short hashes inline +
  a muted `+N more`. Hover shows a styled, body-level tooltip with the full list
  (positioned so it flips above the cell near the bottom of the screen and never
  clips). The copy button + CSV export use the complete comma-separated list
  (`data-commit`). Cap is `MAX_VISIBLE_COMMITS` in `renderDashboard`.
- **Summary cards count block producers, not node records** ("… Block Producers")
  — unless `SHOW_NON_BP_NODES` is on, where they count rows and the noun becomes
  "Nodes" (`countNoun` in `renderDashboard`).
- **Responsive:** `≤1024px` collapses the 5-col dashboard grid to 2; `≤640px` is a
  single column and **hides the header stats** (they duplicate the cards below).

## Dev workflow

- Tests: `npm test` (Jest + ts-jest). Unit tests import real pure logic
  (`block-producer-rows.ts`, `renderDashboard`) and avoid the DB; repository-level
  code is mocked via `tests/mocks/prisma.ts`. Keep tests DB-free where possible.
- Local DB: isolated Postgres in `./.localpg` on **port 5433** (`DATABASE_URL` in
  `.env`). Pull real prod data with `node scripts/sync-from-live.js` (read-only
  public API → local DB; it refuses to write to a remote-looking DATABASE_URL).
- Run locally: `npm run dev` (ts-node-dev). `RELEASE_PERCENTAGE` env sets the
  release-target marker on the adoption bar.
- Build: `npm run build` (runs `prisma generate` then `tsc`).

## Conventions

- Match the existing code style; the dashboard markup/CSS lives entirely in
  `templates.ts` — keep new styles in that `<style>` block and new client JS in the
  trailing `<script>`.
- Prefer adding pure, importable functions (like `block-producer-rows.ts`) over
  inlining logic in services, so it stays unit-testable without the DB.
