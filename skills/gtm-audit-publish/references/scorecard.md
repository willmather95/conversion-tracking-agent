# Audit scorecard

## Severity
| Level | Name | Meaning | Examples |
|---|---|---|---|
| P0 | Broken | Tracking for a money action is down, wrong, or leaking data | Container not loading; conversion tag on wrong ID; tags blocked on the real domain; PII sent to GA4/ad platforms |
| P1 | Double count / missing conversion / consent | Numbers you bid or report on are wrong, or legal risk | Lead counted twice; key action has no tag; consent default late or missing; pixels fire with no consent path |
| P2 | Data quality | Numbers are usable but noisy or partial | Fallback values that never work; high-cardinality params; EM name collision risk; no cross-domain |
| P3 | Hygiene | Makes the next change risky or slow | Unused tags/triggers/vars; hard-coded IDs; no folders; versions named "updates" |

Rank by: money at risk first, then legal risk, then effort. A P1 that takes
5 minutes goes above a P1 that needs a developer.

## Finding categories (tag each finding)
`broken` · `double-count` · `missing-conversion` · `consent` · `privacy` ·
`data-quality` · `hygiene` · `drift` (repo or docs differ from live)

## Container score (optional, out of 100)
Start at 100. Subtract: P0 −25 each, P1 −10, P2 −4, P3 −1 (floor 0).
Report the score with the list. The list matters more than the number.

## Ads trust level (when an Ads account is in scope)
| Level | Meaning | What to do |
|---|---|---|
| High | 1-2 clear primary conversions, no duplicates, right counting, 15+ conv in 30 days | Optimize freely |
| Medium | Minor issues (micro-conversions as primary, 5-14 conv/30d, possible over-count) | Optimize with care; fix issues |
| Low | Duplicates, wrong counting, under 5 conv/30d, polluted signal | Fix tracking first; block budget scaling |
| Broken | No real conversion signal | Stop. Fix tracking. Nothing else matters |

Checks: primary vs secondary, "One" counting for leads ("Every" only for
sales), `conversions` vs `all_conversions` ratio above 2x, same event from tag
AND GA4 import, auto-tagging on, default values vs real values.
When trust is Low or Broken, say which decisions should wait (budget changes)
and which can go ahead (negative keywords, ad copy).

## Status words (never merge them)
`configured` → `published` → `fires` → `delivered` (network 2xx) →
`received` (GA4/Ads/Meta shows it) → `matches the business record`.
Each gets PASS, PARTIAL, BLOCKED, FAIL or UNKNOWN with evidence.
