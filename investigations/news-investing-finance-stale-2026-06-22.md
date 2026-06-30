# Investigation: `News` -> `Investing and Finance` rendered `STALE`

Date: 2026-06-22

## Stronghold

- Confirmed: the Circle UI is driven by a hosted snapshot URL, not the checked-in `dist/circle-facing/snapshot.json`.
- Confirmed: the hosted snapshot at `https://stradtmann73.github.io/IntelligenceDesk/snapshot.json` on 2026-06-22 12:09:18Z contains `news -> investing_and_finance -> state: "stale"` and reuses June 19 Bloomberg items.
- Confirmed: the checked-in local artifacts in this repo do **not** currently match that live hosted snapshot.

## Key Evidence

- `src/lib/rendering/build-circle-html.ts:9` hard-codes the hosted snapshot URL.
- `src/lib/rendering/build-circle-html.ts:126-130` uses the hosted snapshot URL outside `file:` preview mode.
- `src/lib/rendering/build-circle-html.ts:475-482` fetches the hosted snapshot and renders it.
- `scripts/generate-circle-facing.ts:10,21-23` only copies `data/current/snapshot.json` into `dist/circle-facing/snapshot.json`; it does not control the already-hosted GitHub Pages snapshot.
- `data/current/snapshot.json:198-228` shows local `investing_and_finance` as `state: "ready"` in the checked-in repo copy.
- `dist/circle-facing/snapshot.json:198-228` also shows local `investing_and_finance` as `state: "ready"`.
- Hosted snapshot captured on 2026-06-22 showed:
  - `publish_state: "held_stale"`
  - `news.columns[0].state: "stale"`
  - `news.columns[0].items[*].source_checked_at: "2026-06-19T15:03:57.934Z"`
  - `business_general` items with `source_checked_at: "2026-06-22T12:09:18.851Z"`

## Code Path

1. `scripts/refresh-all.ts:24-46` runs fetch -> normalize -> summarize -> classify -> validate.
2. `scripts/refresh-all.ts:54-78` runs review, derives publish state, and calls `buildSnapshotCandidate(...)` with `sourceFailures` and `previousSnapshot`.
3. `src/lib/pipeline/build-snapshot.ts:166-175` marks a column stale only when:
   - the column is `affected` by a source failure, and
   - the current run has no selected items for that column, and
   - the previous snapshot has items to reuse.
4. `src/lib/pipeline/build-snapshot.ts:209-216` sets overall snapshot state to `held_stale` when any source failure exists and a previous snapshot is available.
5. `src/lib/pipeline/build-snapshot.ts:86-105` maps failed news sources to `news:${source.scope.topic}`.
6. `src/lib/sources/registry.ts:25-29` shows the `investing_and_finance` topic is fed by:
   - `cnbc-broad-news`
   - `bloomberg-ai-news`

## Findings

- Confirmed: `Investing and Finance` becomes stale by design when at least one finance-topic source fails and the current run has no fresh approved finance items. See `src/lib/pipeline/build-snapshot.ts:166-175`.
- Confirmed: the stale card text in the screenshot is the exact renderer output for `column.state === "stale"`. See `src/lib/rendering/build-circle-html.ts:244-263`.
- Confirmed: the live hosted snapshot on 2026-06-22 12:09:18Z is using fallback data from the prior June 19 snapshot for the finance column, because those carried-forward items still have June 19 `source_checked_at` values while neighboring business-general items have June 22 `source_checked_at`.
- Deduced: the live stale state was produced during a bad refresh window before 2026-06-22 12:09:18Z, not by the checked-in repo snapshot currently on disk.
- Confirmed from current source execution: rerunning the news fetchers now does **not** reproduce the stale finance column.
  - `fetchBloombergNews(...)` currently returns 2 finance items.
  - `fetchCnbcBroadNews(...)` currently returns 12 items.
  - An in-memory rerun of the pipeline now produces `news.investing_and_finance.state: "ready"` with `sourceFailures: []`.

## Conclusion

The stale finance card is expected behavior from the snapshot builder, not a Circle rendering bug. The live hosted snapshot was generated during a refresh window where the finance column ended up with no fresh approved items and at least one finance-topic source failure, so the builder intentionally replayed the previous approved finance items with a stale warning.

What is **not** expected is the confusion created by local artifacts showing `ready` while Circle shows `stale`. That discrepancy exists because Circle fetches the hosted snapshot directly, and the hosted snapshot had advanced beyond the checked-in local snapshot.

## Smallest Safe Fix

No code fix is required to explain the observed `STALE` card.

If you want to reduce recurrence, the smallest safe product/code improvement would be:

- add lightweight refresh diagnostics that persist `sourceFailures` per run alongside the archived snapshot, so future stale states can be traced to the exact failing source without needing live endpoint repro or inference.

## Follow-up Checks

- Verify the publish job that updates the hosted GitHub Pages `snapshot.json` ran after finance sources recovered.
- If stale finance recurs often, instrument and archive:
  - fetch status per source
  - raw item counts per source
  - post-validation approved counts per column
