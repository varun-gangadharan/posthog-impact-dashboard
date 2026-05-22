import { useState, useEffect, useMemo } from "react";
import type { DashboardData, EngineerScore, ContributionScore } from "./types";
import Leaderboard from "./components/Leaderboard";
import EngineerDetail from "./components/EngineerDetail";
import EvidenceTable from "./components/EvidenceTable";
import Filters from "./components/Filters";
import Methodology from "./components/Methodology";
import DashboardHeader from "./components/dora/DashboardHeader";
import DoraCards from "./components/dora/DoraCards";
import DeploymentChart from "./components/dora/DeploymentChart";
import LeadTimeDistribution from "./components/dora/LeadTimeDistribution";
import FailureRateMTTR from "./components/dora/FailureRateMTTR";
import TeamVelocity from "./components/dora/TeamVelocity";
import CodeQuality from "./components/dora/CodeQuality";
import ThreadBackground from "./components/dora/ThreadBackground";
import SectionDivider from "./components/dora/SectionDivider";
import AnimatedPanel from "./components/dora/AnimatedPanel";
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

function getTimeWindowCutoff(window: string): Date | null {
  if (window === "all") return null;
  const now = new Date();
  switch (window) {
    case "1h": return new Date(now.getTime() - 60 * 60 * 1000);
    case "1d": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "1w": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

function filterEngineers(
  engineers: EngineerScore[],
  repoArea: string,
  workType: string,
  timeWindow: string
): EngineerScore[] {
  const cutoff = getTimeWindowCutoff(timeWindow);

  return engineers
    .map((eng) => {
      const filtered = eng.topEvidence.filter((ev) => {
        const areaMatch = repoArea === "All" || ev.repoArea === repoArea;
        const typeMatch = workType === "All" || ev.type === workType;
        const timeMatch = !cutoff || new Date(ev.date) >= cutoff;
        return areaMatch && typeMatch && timeMatch;
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
  const [timeWindow, setTimeWindow] = useState("all");
  const [environment, setEnvironment] = useState("Production");

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
    const isDefault = repoArea === "All" && workType === "All" && timeWindow === "all";
    if (isDefault) {
      return data.engineers.map((eng) => ({
        ...eng,
        topEvidence: eng.topEvidence.map(sanitizeEvidence),
      }));
    }
    return filterEngineers(data.engineers, repoArea, workType, timeWindow);
  }, [data, repoArea, workType, timeWindow]);

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
    <div className="relative min-h-screen">
      <ThreadBackground />

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 py-6">
        <DashboardHeader
          environment={environment}
          onEnvironmentChange={setEnvironment}
        />

        <DoraCards />

        <AnimatedPanel delay={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <DeploymentChart />
            <LeadTimeDistribution />
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.45}>
          <FailureRateMTTR />
        </AnimatedPanel>

        <AnimatedPanel delay={0.6}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <TeamVelocity />
            <CodeQuality />
          </div>
        </AnimatedPanel>

        <SectionDivider label="Engineer Impact" sublabel="Individual contribution analysis" />

        <AnimatedPanel delay={0.75}>
        <div className="dashboard rounded-xl border border-navy-700 bg-navy-900/80 p-6">
          <header className="dashboard-header">
            <h1>PostHog Engineer Impact Dashboard</h1>
            <p className="subtitle">
              Top most impactful engineers in{" "}
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
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-state" role="status" aria-label="Loading">
              <p>Loading engineer data...</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="results-count">
                Showing {Math.min(filtered.length, 20)} of {filtered.length} engineers
              </div>
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
              {data.timeWindowDays} days | {data.engineers.length} engineers scored
            </footer>
          )}
        </div>
        </AnimatedPanel>
      </div>
    </div>
  );
}
