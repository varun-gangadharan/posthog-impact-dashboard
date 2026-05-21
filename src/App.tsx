import { useState, useEffect, useMemo } from "react";
import type { DashboardData, EngineerScore, ContributionScore } from "./types";
import Leaderboard from "./components/Leaderboard";
import EngineerDetail from "./components/EngineerDetail";
import EvidenceTable from "./components/EvidenceTable";
import Filters from "./components/Filters";
import Methodology from "./components/Methodology";
import "./App.css";

const GITHUB_URL_RE = /^https:\/\/github\.com\/PostHog\/posthog\/(pull|issues)\/\d+$/;

function isValidGitHubUrl(url: string): boolean {
  return GITHUB_URL_RE.test(url);
}

function sanitizeEvidence(ev: ContributionScore): ContributionScore {
  return {
    ...ev,
    url: isValidGitHubUrl(ev.url) ? ev.url : "#",
  };
}

function filterEngineers(
  engineers: EngineerScore[],
  repoArea: string,
  workType: string
): EngineerScore[] {
  return engineers
    .map((eng) => {
      const filtered = eng.topEvidence.filter((ev) => {
        const areaMatch = repoArea === "All" || ev.repoArea === repoArea;
        const typeMatch = workType === "All" || ev.type === workType;
        return areaMatch && typeMatch;
      });
      if (filtered.length === 0) return null;

      const total = filtered.length;
      const delivery = filtered.reduce((s, e) => s + e.deliveryScore, 0) / total;
      const product = filtered.reduce((s, e) => s + e.productScore, 0) / total;
      const leverage = filtered.reduce((s, e) => s + e.leverageScore, 0) / total;
      const quality = filtered.reduce((s, e) => s + e.qualityScore, 0) / total;
      const score = delivery * 0.35 + product * 0.25 + leverage * 0.25 + quality * 0.15;

      return {
        ...eng,
        topEvidence: filtered.map(sanitizeEvidence),
        totalScore: Math.round(score),
        deliveryScore: Math.round(delivery),
        productScore: Math.round(product),
        leverageScore: Math.round(leverage),
        qualityScore: Math.round(quality),
      } as EngineerScore;
    })
    .filter((e): e is EngineerScore => e !== null)
    .sort((a, b) => b.totalScore - a.totalScore);
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [repoArea, setRepoArea] = useState("All");
  const [workType, setWorkType] = useState("All");

  useEffect(() => {
    fetch("/data/scored-engineers.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data: ${r.status}`);
        return r.json();
      })
      .then((d: DashboardData) => {
        setData(d);
        if (d.engineers.length > 0) {
          setSelectedHandle(d.engineers[0].handle);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (repoArea === "All" && workType === "All") {
      return data.engineers.map((eng) => ({
        ...eng,
        topEvidence: eng.topEvidence.map(sanitizeEvidence),
      }));
    }
    return filterEngineers(data.engineers, repoArea, workType);
  }, [data, repoArea, workType]);

  const selectedEngineer: EngineerScore | null =
    filtered.find((e) => e.handle === selectedHandle) ?? null;

  useEffect(() => {
    if (filtered.length > 0 && !filtered.find((e) => e.handle === selectedHandle)) {
      setSelectedHandle(filtered[0].handle);
    } else if (filtered.length === 0) {
      setSelectedHandle(null);
    }
  }, [filtered, selectedHandle]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>PostHog Engineer Impact Dashboard</h1>
        <p className="subtitle">
          Top 5 most impactful engineers in{" "}
          <a
            href="https://github.com/PostHog/posthog"
            target="_blank"
            rel="noreferrer"
          >
            PostHog/posthog
          </a>{" "}
          based on public GitHub activity
        </p>
        <div className="caution-label" role="status" aria-label="Caution">
          This is an impact heuristic, not a performance review tool. Scores
          reflect public GitHub signals only and should be a starting point for
          investigation, not a final judgment.
        </div>
      </header>

      <Filters
        repoArea={repoArea}
        onRepoAreaChange={setRepoArea}
        workType={workType}
        onWorkTypeChange={setWorkType}
      />

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-state" role="status" aria-label="Loading">
          <p>Loading engineer data…</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <main className="dashboard-main">
            <section aria-label="Leaderboard">
              <Leaderboard
                engineers={filtered}
                selectedHandle={selectedHandle}
                onSelect={setSelectedHandle}
              />
            </section>
            <section aria-label="Engineer detail">
              <EngineerDetail engineer={selectedEngineer} />
            </section>
          </main>

          {selectedEngineer && (
            <section className="evidence-section" aria-label="Evidence">
              <EvidenceTable evidence={selectedEngineer.topEvidence} />
            </section>
          )}
        </>
      )}

      <Methodology />

      {data && (
        <footer className="dashboard-footer">
          Data generated:{" "}
          {new Date(data.generatedAt).toLocaleDateString()} | Window:{" "}
          {data.timeWindowDays} days
        </footer>
      )}
    </div>
  );
}
