# Intelligence Desk Finance Stale Investigation

## Problem Statement

The hosted Intelligence Desk page at `https://answerbar.io/intelligence-desk` was showing fresh `Business General` items on June 24, 2026 while `Investing and Finance` remained stale with June 19 Bloomberg-only items.

## Confirmed Evidence

- The live page fetches `https://stradtmann73.github.io/IntelligenceDesk/snapshot.json`.
- The hosted snapshot on June 24, 2026 reported `publish_state: "held_stale"` and `news.columns[investing_and_finance].state: "stale"`.
- A local refresh on June 24, 2026 successfully fetched both `cnbc-broad-news` and `bloomberg-ai-news`.
- All `cnbc-broad-news` items were blocked during validation with `source_name_mismatch`.
- The validation mismatch happened because both CNBC sources share the same host, and validation matched the broad-feed items against the first CNBC source label instead of the exact source label.
- `normalizeNewsTopic()` preferred the source fallback topic over content routing, which forced all `cnbc-ai-news` items into `business_general` even when the headlines were clearly finance-oriented.

## Deduced Conclusion

The finance column was effectively over-dependent on Bloomberg. When Bloomberg failed or produced no approved items in a hosted refresh, CNBC could not fill the gap because:

1. `cnbc-broad-news` items were being invalidated.
2. `cnbc-ai-news` finance-relevant stories were forced into `business_general`.

## Fix Direction

- Make source validation prefer an exact source-label match when multiple approved sources share the same host.
- Let semantic topic routing win before the source fallback topic.
- Tighten the CNBC broad-feed filter so it only contributes AI-plus-finance candidates.
