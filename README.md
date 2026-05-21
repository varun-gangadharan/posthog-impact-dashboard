# PostHog Engineer Impact Dashboard

A single-page dashboard that ranks the top 5 most impactful engineers in the [PostHog/posthog](https://github.com/PostHog/posthog) repository using public GitHub data, with explainable scoring and confidence labels.

Impact is measured across four weighted dimensions: Delivery Impact (35%), Product Proximity (25%), Leverage (25%), and Execution Quality (15%). Raw activity metrics like commit count, lines of code, or PR count are **not** used as primary signals.

> This is an impact heuristic, not a performance review tool.

## Setup

```bash
# 0. Use the project Node version
nvm use

# 1. Install dependencies
npm install

# 2. Copy environment file and add your GitHub token
cp .env.example .env
# Edit .env and add a GitHub personal access token with public_repo scope

# 3. Fetch GitHub data (requires GITHUB_TOKEN)
npm run fetch:data

# 4. Score engineers from fetched data
npm run score:data

# 5. Copy scored data to public directory for the dashboard
cp data/scored-engineers.json public/data/scored-engineers.json

# 6. Start development server
npm run dev
```

If `npm run dev` shows a blank white page, first check `node -v`. This project expects Node 20+; Node 18.8 is too old for the current npm/tooling stack.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run fetch:data` | Fetch GitHub data for PostHog/posthog |
| `npm run score:data` | Score engineers from fetched data |

## Project Structure

```
scripts/              Server-side data pipeline (never shipped to browser)
  fetch-github-data.ts   GitHub API fetcher
  score-engineers.ts     Impact scoring engine
data/                 Generated JSON (gitignored raw data)
public/data/          Static scored data served to browser
src/
  types.ts            Shared TypeScript types
  App.tsx             Dashboard shell
  components/
    Leaderboard.tsx   Top 5 ranking list
    EngineerDetail.tsx  Score breakdown + evidence
    Filters.tsx       Time/area/type filters
    Methodology.tsx   Scoring explanation
```

## Security

- `GITHUB_TOKEN` is read only by Node scripts in `scripts/`. It is never imported or referenced in any browser-side code.
- `.env` is gitignored. Only `.env.example` (with no values) is committed.
- All GitHub-provided text (titles, bodies, labels, handles) is treated as untrusted and rendered via React's default escaping. No `dangerouslySetInnerHTML` is used anywhere.
- External links use `rel="noreferrer"`.
