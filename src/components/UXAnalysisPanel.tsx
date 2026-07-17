"use client";

import { useState, useRef } from "react";
import type { DeviceType } from "@/lib/types";

interface Props {
  pageId: string;
  device: DeviceType;
  screenshotUrl: string | null;
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 8 ? "#34D399" : score >= 6 ? "#FBB124" : "#F87171";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {score}/10
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#34D399" : score >= 6 ? "#FBB124" : "#F87171";
  return (
    <div className="h-1 rounded-full w-full mt-1" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-1 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## Overall Score:")) {
      const match = line.match(/(\d+)\/10/);
      const score = match ? parseInt(match[1]) : null;
      elements.push(
        <div key={key++} className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Overall Score</p>
            {score !== null && (
              <p className="text-4xl font-bold gradient-text">{score}<span className="text-xl text-white/40">/10</span></p>
            )}
          </div>
          {score !== null && (
            <div className="flex-1">
              <div className="h-2 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(score / 10) * 100}%`,
                    background: "linear-gradient(90deg, #8B5CF6, #06B6D4)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      );
    } else if (line.startsWith("## ") && line.includes("—")) {
      const match = line.match(/## (.+?) — (\d+)\/10/);
      if (match) {
        const title = match[1];
        const score = parseInt(match[2]);
        elements.push(
          <div key={key++} className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white/80">{title}</h3>
              <ScorePill score={score} />
            </div>
            <ScoreBar score={score} />
          </div>
        );
      }
    } else if (line.startsWith("## Priority Fixes")) {
      elements.push(
        <div key={key++} className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Priority Fixes</h3>
        </div>
      );
    } else if (line.startsWith("**Observation:**") || line.startsWith("**Issue:**") || line.startsWith("**Fix:**")) {
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      elements.push(
        <p key={key++} className="text-sm text-white/60 leading-relaxed mt-1.5">
          {parts.map((p, i) =>
            p.startsWith("**") && p.endsWith("**")
              ? <span key={i} className="text-white/80 font-medium">{p.slice(2, -2)}</span>
              : p
          )}
        </p>
      );
    } else if (/^\d+\. \*\*/.test(line)) {
      const match = line.match(/^(\d+)\. \*\*(.+?)\*\* — (.+)/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-3 mt-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-white/30 text-sm font-mono flex-shrink-0">{match[1]}.</span>
            <div>
              <p className="text-sm font-semibold text-white/80">{match[2]}</p>
              <p className="text-xs text-white/45 mt-0.5">{match[3]}</p>
            </div>
          </div>
        );
      }
    } else if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm text-white/50 leading-relaxed mt-1">
          {line}
        </p>
      );
    }
  }

  return elements;
}

export function UXAnalysisPanel({ pageId, device, screenshotUrl }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [content, setContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function runAnalysis() {
    if (!screenshotUrl) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setContent("");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/pages/${pageId}/ux-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "no_screenshot") {
          setErrorMsg("No screenshot found for this device. Capture a screenshot first by visiting the tracked page.");
        } else {
          setErrorMsg(data.error || `Error ${res.status}`);
        }
        setStatus("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setStatus("error"); return; }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setContent(accumulated);
      }
      setStatus("done");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg("Request failed — check your ANTHROPIC_API_KEY environment variable.");
        setStatus("error");
      }
    }
  }

  if (!screenshotUrl && status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#FBB124" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          No screenshot for this device
        </div>
        <p className="text-white/30 text-xs text-center max-w-xs">
          Visit the tracked page on this device type to capture a screenshot, then run the analysis.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Run / re-run button */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-white/40">
            AI-powered UX audit · {device} screenshot · Claude Vision
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={status === "loading"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: status === "loading"
              ? "rgba(139,92,246,0.15)"
              : "linear-gradient(135deg,#8B5CF6,#06B6D4)",
            color: "white",
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Analysing…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
              </svg>
              {status === "done" ? "Re-run Analysis" : "Run UX Analysis"}
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {status === "error" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-sm mb-4"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#FCA5A5" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Skeleton while first tokens arrive */}
      {status === "loading" && !content && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl" style={{ background: "rgba(139,92,246,0.08)" }} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 rounded w-2/3" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 rounded w-5/6" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Streamed content */}
      {content && (
        <div className="space-y-0.5">
          {renderContent(content)}
          {status === "loading" && (
            <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: "#8B5CF6" }} />
          )}
        </div>
      )}

      {/* Idle placeholder */}
      {status === "idle" && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.15))", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#g)" strokeWidth="1.5">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-sm font-medium">UX Analysis</p>
            <p className="text-white/30 text-xs mt-1 max-w-xs">
              Scores 10 UX dimensions against established frameworks — Krug, Nielsen, WCAG 2.2, and more.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
