import { useState, useEffect, useMemo } from "react";
import type { DashboardData, EngineerScore, ContributionScore } from "./types";
import Leaderboard from "./components/Leaderboard";
import EngineerDetail from "./components/EngineerDetail";
import EvidenceTable from "./components/EvidenceTable";
import Filters from "./components/Filters";
import Methodology from "./components/Methodology";
import ThreadBackground from "./components/visual/ThreadBackground";
import AnimatedPanel from "./components/visual/AnimatedPanel";
import { Activity, Clock } from "lucide-react";
import { motion } from "motion/react";
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

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-6">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-6 overflow-hidden rounded-xl border border-navy-700 bg-navy-900/80 px-6 py-5 backdrop-blur-sm"
        >
          <div className="absolute inset-0 opacity-[0.06]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="header-threads" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M0 40 Q20 20 40 40 Q60 60 80 40" fill="none" stroke="#6366f1" strokeWidth="0.8" />
                  <path d="M0 20 Q20 40 40 20 Q60 0 80 20" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#header-threads)" />
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-indigo-accent" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white m-0">
                  PostHog Engineer Impact Dashboard
                </h1>
                <p className="text-sm text-slate-400 m-0">
                  Top most impactful engineers in{" "}
                  <a href="https://github.com/PostHog/posthog" target="_blank" rel="noreferrer" className="text-indigo-accent hover:underline">
                    PostHog/posthog
                  </a>{" "}
                  based on public GitHub activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {new Date().toLocaleTimeString()}</span>
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-signal animate-pulse" />
            </div>
          </div>
        </motion.header>

        <AnimatedPanel delay={0.15}>
          <div className="caution-label" role="status" aria-label="Caution">
            This is an impact heuristic, not a performance review tool. Scores
            reflect public GitHub signals only and should be a starting point for
            investigation, not a final judgment.
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.25}>
          <Filters
            repoArea={repoArea}
            onRepoAreaChange={setRepoArea}
            workType={workType}
            onWorkTypeChange={setWorkType}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        </AnimatedPanel>

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
          <AnimatedPanel delay={0.35}>
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
          </AnimatedPanel>
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
    </div>
  );
}
