# PostHog Engineer Impact Dashboard — Handoff Document

## Project Overview

A single-page dashboard ranking the top 5 most impactful engineers in `PostHog/posthog` using public GitHub data, with explainable scoring and confidence labels.

**Location:** `/Users/Varun/Desktop/posthog-impact-dashboard`
**Stack:** Vite + React + TypeScript
**PRD:** `/Users/Varun/Desktop/PostHog Engineer Impact Dashboard PRD.md`
**Phase Plan:** `/Users/Varun/Desktop/PostHog Dashboard Feature Phase Plan and Prompts.md`

---

## Completed Phases

### Phase 0: Project Scaffold
- Vite React TypeScript app with working `dev`, `build`, `lint`, `preview` scripts
- Dashboard shell with `Leaderboard`, `EngineerDetail`, `Filters`, `Methodology` components
- `.env.example` with instructions; `.env` gitignored
- `public/data/scored-engineers.json` serves static data to the browser
- No `dangerouslySetInnerHTML` anywhere; all GitHub text rendered via React escaping
- External links use `rel="noreferrer"`
- Build passes, dev server starts

### Phase 1: GitHub Data Ingestion
- **Script:** `scripts/fetch-github-data.ts` (run via `npm run fetch:data`)
- Fetches from GitHub REST API with full pagination via Link headers
- Collects: merged PRs, changed files per PR, reviews per PR, closed issues
- Parses linked issues from PR body (`Closes #N`, `Fixes #N`, `Resolves #N`)
- Detects reverts via `^Revert ` title pattern
- Rate limit handling: reads `x-ratelimit-remaining`, pauses when approaching 0
- CLI arg `--days=N` (default 90)
- Outputs to `data/raw-github.json`
- **Inspection script:** `scripts/inspect-data.ts` (run via `npm run inspect:data`)
  - Prints counts, date ranges, sample PRs, revert/bot/linked-issue stats
  - Scans for token-like strings in output data
- **Security:** Token from env only, redacted in error output, never in data files
- **Note:** Has NOT been run yet — requires `GITHUB_TOKEN` to be set

### Phase 2: Data Normalization
- **Script:** `scripts/normalize-data.ts` (run via `npm run normalize:data`)
- Reads `data/raw-github.json`, outputs `data/normalized.json`
- Filters to merged PRs + closed issues only
- Bot detection: `[bot]` in login, `authorType === "Bot"`, known bots list (dependabot, renovate, github-actions, posthog-bot, codecov, netlify, vercel)
- Truncates bodies to 500 chars
- Aggregates: additions/deletions totals, unique reviewers, resolved linked issues (cross-referenced against fetched issues)
- Prints validation summary: counts, date range, missing fields, bot accounts
- **Types added to `src/types.ts`:** `NormalizedContribution`, `NormalizedData`
- **Sample data:** `data/normalized-sample.json` with 3 realistic fake contributions
- **Note:** Has NOT been run yet — requires Phase 1 output

### Phase 3: Work Classification
- **Script:** `scripts/classify-work.ts` (run via `npm run classify:data`)
- **Tests:** `scripts/test-classification.ts` (run via `npm run test:classify`) — 50 assertions, all passing
- Reads `data/normalized.json` (falls back to `data/normalized-sample.json`), outputs `data/classified.json`
- Deterministic rule-based classification — no LLM or prompt-based logic
- **Classification layers (applied in order):**
  1. **Label rules:** 21 work-type patterns + 16 repo-area patterns matched against GitHub labels
  2. **File path rules:** 40+ patterns for CI, test infra, docs, frontend, backend, infrastructure, product scenes, shared libraries, migrations
  3. **Title keyword rules:** Conventional commit prefixes (`feat:`, `fix:`, `chore:`, `perf:`, `docs:`, `test:`, `ci:`) and product domain keywords (onboarding, billing, insights, retention, funnels, session recordings, feature flags, etc.)
  4. **Body keyword rules:** Customer-facing, breaking change, security fix signals
  5. **Metadata signals:** Milestone, linked issues, revert detection
  6. **Fallback:** Defaults to Maintenance / Other if no rules match
- Multiple `WorkType` and `RepoArea` tags per contribution
- Each classification includes human-readable `ClassificationReason[]` with rule name, signal source, and matched text
- Primary work type and repo area picked via priority ordering (Product Feature > Bug Fix > ... > Maintenance)
- **Types added to `src/types.ts`:** `ClassificationReason`, `ClassifiedContribution`, `ClassifiedData`
- **Security:** All input strings coerced via `String()` before regex matching. No `eval`, no HTML rendering, no execution of fetched text.
- **Spot-check output:** Classification script prints top 20 contributions with full tag/reason breakdown

### Phase 4: Impact Scoring Engine
- **Script:** `scripts/score-engineers.ts` (run via `npm run score:data`)
- **Tests:** `scripts/test-scoring.ts` (run via `npm run test:score`) — 43 assertions, all passing
- Reads `data/classified.json`, outputs `data/scored-engineers.json` + copies to `public/data/scored-engineers.json`
- **Contribution-level scoring across 4 dimensions:**
  - **Delivery Impact (35%):** Merged PR (+30), linked closed issues (+15 each, cap 3), milestone (+10), meaningful file scope (+10), size with diminishing returns. Issues get 0.3x delivery weight.
  - **Product Proximity (25%):** Product work types (+30), product repo areas (+25), secondary product tags (+5 each), bug fix in product area bonus (+10).
  - **Leverage (25%):** Leverage work types (+30), leverage repo areas (+25), shared library code (+15), cross-cutting multi-area (+10), secondary leverage tags (+5 each).
  - **Execution Quality (15%):** Merged work base (+20), review count bonus (+10/+15), reasonable scope bonus (+10), revert penalty (-50% quality, -50% delivery).
- **Engineer-level aggregation:** Top 50 contributions per engineer, weighted by diminishing position (1st full, subsequent decay by 0.15). Breadth bonus from log2(contribution count).
- **Large PR cap:** PRs over 1500 total lines get 0.6x size factor for delivery.
- **Bot exclusion:** Bot accounts from normalization phase filtered out before scoring.
- **All scores normalized to 0-100 range.**
- **Score deterministic and auditable** — every contribution has an `evidence[]` array explaining each scoring decision.
- **Security:** No formula mutation via URL params. No unsanitized HTML rendering. Score logic is pure functions on structured data.
- **Validation:** Automated tests cover: e2e testing work vs UI tweak, large PR cap, revert penalty, bot exclusion, review impact, product feature with linked issue, score normalization range.

### Phase 5: Confidence Labels and Explanations
- **Integrated into `scripts/score-engineers.ts`** (not a separate script)
- **Confidence levels per engineer:**
  - **High:** 4+ confidence signals (3+ evidence items, multiple active dimensions, 5+ contributions, no reverts)
  - **Medium:** 2-3 confidence signals
  - **Low:** 0-1 confidence signals (sparse data, single contribution, revert-heavy)
- **Confidence signals counted:** Evidence count, active dimension count (>15 threshold), contribution volume, absence of reverts
- **Summary generation:** Structured text from scoring data — includes engineer handle, contribution count, primary impact description, top PR numbers. No raw GitHub markdown rendered.
- **Caveats:** Auto-generated based on confidence level:
  - Single contribution caveat
  - Sparse data caveat
  - Few evidence items caveat
  - Concentrated dimensions caveat
  - Universal caveat about public GitHub activity limitations
- **Validation against prohibited language:** Scoring script checks all summaries for performance-review phrases ("best engineer", "top performer", "promotion", etc.) and warns if found.
- **Evidence URL validation:** Script verifies all top evidence items have valid `https://github.com/` URLs.
- **Tests cover:** High confidence (8 PRs with full signals), low confidence (single small contribution), medium confidence (few maintenance-only contributions), explanation quality (no prohibited phrases, evidence links present, PR number references).

---

## Current File Structure

```
posthog-impact-dashboard/
├── scripts/
│   ├── fetch-github-data.ts     # Phase 1: GitHub API fetcher
│   ├── inspect-data.ts          # Phase 1: Data validation/inspection
│   ├── normalize-data.ts        # Phase 2: Raw → normalized conversion
│   ├── classify-work.ts         # Phase 3: Rule-based work classification
│   ├── score-engineers.ts       # Phase 4+5: Scoring engine + confidence/explanations
│   ├── test-classification.ts   # Phase 3: 50 classification test assertions
│   └── test-scoring.ts          # Phase 4+5: 43 scoring/confidence test assertions
├── data/
│   ├── raw-github.json          # Phase 1 output (gitignored, needs fetch:data)
│   ├── normalized.json          # Phase 2 output (needs normalize:data)
│   ├── normalized-sample.json   # Sample data for testing (3 contributions)
│   ├── classified.json          # Phase 3 output (from classify:data)
│   └── scored-engineers.json    # Phase 4+5 output (from score:data)
├── public/
│   └── data/
│       └── scored-engineers.json # Static data served to browser (auto-copied by score:data)
├── src/
│   ├── types.ts                 # All TypeScript types (dashboard + normalized + classified)
│   ├── App.tsx                  # Dashboard shell
│   ├── App.css                  # All dashboard styles
│   ├── index.css                # Base/reset styles
│   ├── main.tsx                 # React entry point
│   └── components/
│       ├── Leaderboard.tsx      # Top 5 ranking list
│       ├── EngineerDetail.tsx   # Score breakdown + evidence panel
│       ├── EvidenceTable.tsx    # Evidence drill-down table
│       ├── Filters.tsx          # Area/type filter controls with allowlist validation
│       └── Methodology.tsx      # Scoring explanation + caveats panel
├── validate-dashboard.mjs      # Playwright validation script (41 assertions)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run fetch:data` | Fetch GitHub data (requires GITHUB_TOKEN) |
| `npm run inspect:data` | Inspect/validate raw fetched data |
| `npm run normalize:data` | Normalize raw data into compact schema |
| `npm run classify:data` | Classify contributions by work type and repo area |
| `npm run score:data` | Score engineers + generate confidence/explanations |
| `npm run test:classify` | Run 50 classification unit tests |
| `npm run test:score` | Run 43 scoring/confidence unit tests |
| `npm run test:pipeline` | Run all tests (classification + scoring) |

---

## Data Pipeline Flow

```
GITHUB_TOKEN + --days=N
        │
        ▼
  fetch:data  →  data/raw-github.json
        │
        ▼
  normalize:data  →  data/normalized.json
        │
        ▼
  classify:data  →  data/classified.json
        │
        ▼
  score:data  →  data/scored-engineers.json  +  public/data/scored-engineers.json
        │
        ▼
  browser loads static JSON via Vite dev server
```

---

### Phase 6: Dashboard Shell and Visual Hierarchy
- Dashboard shell with all regions: title, caution label, filters, leaderboard, detail panel, evidence section, methodology, footer
- Loading state while JSON is fetched
- Error state with `role="alert"`
- Empty/no-results state when filters match nothing
- ARIA landmarks: `aria-label` on Leaderboard, Engineer detail, Evidence sections
- `role="status"` on caution label and loading indicator
- Keyboard navigation: all leaderboard rows are focusable via Tab, activatable via Enter/Space
- `focus-visible` outlines on interactive elements
- Layout fits a 1366x768 laptop viewport without excessive scrolling
- **Validated:** 41 Playwright assertions, all passing

### Phase 7: Leaderboard and Engineer Detail Panel
- Rank 1 auto-selected on load
- Clicking any engineer updates detail panel with: total score, confidence + explanation, primary impact type, 4-dimension score breakdown bars (0-100 scale), summary, caveats
- BreakdownBar uses `role="meter"` with `aria-valuenow/min/max`
- Each dimension bar has a tooltip description (e.g. "Shipped, merged work with linked issues")
- Confidence explanation text shown below label (e.g. "Limited contributions or narrow evidence — interpret with caution")
- **Validated:** All 3 sample engineers click-tested, each shows confidence, breakdown, explanation

### Phase 8: Filters and Evidence Drill-Down
- Filters: repo area (8 options) and work type (14 options, matching all `WorkType` values from `types.ts`)
- Filter values validated against fixed allowlists before state update
- Filtering re-scores engineers based on matching evidence subset, re-sorts by weighted total
- Selected engineer resets gracefully if no longer in filtered results
- Empty state: "No engineers match the current filters. Try broadening your selection."
- **Evidence table** (`EvidenceTable.tsx`): PR/issue number, title, type, area, date, weighted score, confidence badge, top 3 evidence reasons, GitHub link
- Evidence URLs validated against `^https://github.com/PostHog/posthog/(pull|issues)/\d+$` regex — invalid URLs show "—"
- All external links use `target="_blank" rel="noreferrer"`
- Removed time window filter (static data has fixed window; filter was misleading)
- **Validated:** Area/type filters update leaderboard and evidence; empty state works; evidence links verified

### Phase 9: Methodology, Caveats, and Auditability
- Inline caveat always visible on page load (no toggle needed): "Scores are a heuristic based on public GitHub signals…"
- Expandable methodology section with:
  - Scoring dimensions table with weights AND signal descriptions
  - "Why Not Raw Activity?" explanation
  - Confidence label definitions (High/Medium/Low with criteria)
  - "What GitHub Data Misses" list: mentoring, design discussions, incident response, planning, private repos, customer context
  - "How to Audit a Score" instructions
- All content is static text — no markdown or HTML rendering
- **Validated:** Caveat visible on load; all 4 weights shown; all 6 limitations mentioned; confidence labels explained

---

## What To Build Next

### Phase 10-11: Polish, Hardening, Deploy
- Final security audit pass
- Vercel deployment
- See Phase Plan Phases 10-11

---

## Key Design Decisions

1. **Vite React (not Next.js):** Simpler for a static dashboard that consumes pre-generated JSON. No server-side rendering needed.
2. **Static JSON pipeline:** Data is fetched/scored via Node scripts, not at runtime. The browser never needs a GitHub token.
3. **REST API (not GraphQL):** Simpler pagination, more straightforward error handling for the enrichment step (files + reviews per PR).
4. **Bot detection at normalization:** Raw data preserves all accounts for auditability; bots are flagged during normalization and excluded from rankings during scoring.
5. **Body truncation at 500 chars:** Prevents large payloads in normalized data while keeping enough context for classification keywords.
6. **Classification before scoring:** Separate classify step produces `classified.json` so classification can be audited independently of scoring. Score engine reads classified data, not raw normalized data.
7. **Confidence integrated with scoring:** Phase 5 (confidence + explanations) is implemented within `score-engineers.ts` rather than a separate script, since confidence depends on the same aggregation pass. This avoids a redundant data read/write cycle.
8. **Diminishing returns on contributions:** Engineer-level scoring uses position-weighted averaging (first contribution counts full, subsequent ones decay) to prevent volume gaming while still rewarding breadth.

---

## Security Invariants

- `GITHUB_TOKEN` is ONLY read in `scripts/fetch-github-data.ts` via `process.env`. It NEVER appears in `src/`, `public/`, or `dist/`.
- `.env` and `.env.local` are gitignored.
- No `dangerouslySetInnerHTML` in any component.
- All external links use `target="_blank" rel="noreferrer"`.
- GitHub-provided text (titles, bodies, labels, handles) is rendered via React's default JSX escaping.
- Classification rules use `String()` coercion and regex `.test()` — no `eval`, no `new Function`, no execution of fetched text.
- Scoring is deterministic pure functions — no URL param or user input can mutate formula weights.
- Explanation summaries are generated from structured scoring data, not from raw GitHub markdown.
- Summaries are validated against prohibited performance-review language.
- Filter values validated against allowlists before state update in `Filters.tsx`.
- Evidence URLs validated against a strict PostHog GitHub URL regex before rendering as links.
- No secrets, tokens, or environment variables referenced in any `src/` file.

---

## How To Run the Full Pipeline

```bash
# 1. Set up token
export GITHUB_TOKEN=ghp_your_token_here

# 2. Fetch data (takes several minutes due to per-PR enrichment)
npm run fetch:data -- --days=90

# 3. Inspect fetched data
npm run inspect:data

# 4. Normalize
npm run normalize:data

# 5. Classify
npm run classify:data

# 6. Score + generate confidence/explanations (auto-copies to public/data/)
npm run score:data

# 7. Run tests
npm run test:pipeline

# 8. Dev server
npm run dev
```

---

## Test Coverage

| Test Suite | Assertions | Coverage |
|---|---|---|
| `test:classify` | 50 | Label rules, file path rules, title prefix/keyword rules, body keyword rules, revert detection, linked issue/milestone signals, default fallbacks, multiple tags, security (XSS input, large input), sample data spot-checks |
| `test:score` | 43 | E2E testing vs UI tweak, large PR cap, revert penalty, bot exclusion, review impact, product feature with linked issue, score normalization 0-100, high/medium/low confidence labels, explanation quality (no prohibited phrases, evidence links, PR references), engineer score range |
| **Total** | **93** | |
