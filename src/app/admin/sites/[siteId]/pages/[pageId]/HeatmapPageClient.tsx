"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EmbedCodeModal } from "@/components/EmbedCodeModal";
import type { Site, Page, EventType, DateRange } from "@/lib/types";

const EVENT_TYPES: { type: EventType; label: string; shortLabel: string; color: string }[] = [
  { type: "mouse_move", label: "Mouse Movement", shortLabel: "Mouse", color: "#06B6D4" },
  { type: "click", label: "Clicks", shortLabel: "Clicks", color: "#8B5CF6" },
  { type: "eye_gaze", label: "Eye Gaze", shortLabel: "Eye", color: "#FBB124" },
];

interface Props {
  site: Site;
  page: Page;
  screenshotUrl: string | null;
  events: { event_type: EventType; x: number; y: number; created_at: string }[];
  stats: { total: number; mouse_move: number; click: number; eye_gaze: number };
  currentRange: string;
  customFrom?: string;
  customTo?: string;
}

export default function HeatmapPageClient({ site, page, screenshotUrl, events, stats, currentRange, customFrom, customTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTypes, setActiveTypes] = useState<EventType[]>(["mouse_move", "click", "eye_gaze"]);
  const [embedOpen, setEmbedOpen] = useState(false);

  const handleRangeChange = useCallback((range: DateRange, from?: string, to?: string) => {
    const params = new URLSearchParams({ range });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname]);

  function toggleType(type: EventType) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/40 mb-5 overflow-hidden">
        <Link href="/admin" className="hover:text-white/70 transition-colors shrink-0">Dashboard</Link>
        <span>/</span>
        <Link href={`/admin/sites/${site.id}`} className="hover:text-white/70 transition-colors truncate max-w-[80px] sm:max-w-none">{site.name}</Link>
        <span>/</span>
        <span className="text-white/70 truncate">{page.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text truncate">{page.name}</h1>
          <a href={page.page_url} target="_blank" rel="noopener noreferrer"
            className="text-white/40 text-xs sm:text-sm mt-1 hover:text-white/60 transition-colors flex items-center gap-1 truncate">
            <span className="truncate">{page.page_url}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M7 17L17 7M7 7h10v10" /></svg>
          </a>
        </div>
        <button onClick={() => setEmbedOpen(true)} className="btn-ghost text-xs sm:text-sm flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
          <span className="hidden sm:inline">Get Embed Code</span>
          <span className="sm:hidden">Embed</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} color="#a78bfa" />
        <StatCard label="Mouse" value={stats.mouse_move} color="#06B6D4" />
        <StatCard label="Clicks" value={stats.click} color="#8B5CF6" />
        <StatCard label="Eye" value={stats.eye_gaze} color="#FBB124" />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 mb-5">
        <DateRangeFilter
          value={currentRange as DateRange}
          onChange={handleRangeChange}
          customFrom={customFrom}
          customTo={customTo}
        />

        {/* Layer toggles — scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {EVENT_TYPES.map(({ type, label, shortLabel, color }) => {
            const active = activeTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex-shrink-0"
                style={{
                  background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? color + "66" : "rgba(255,255,255,0.08)"}`,
                  color: active ? color : "rgba(255,255,255,0.4)",
                  boxShadow: active ? `0 0 16px ${color}33` : "none",
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? color : "rgba(255,255,255,0.2)" }} />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <HeatmapCanvas
          events={events}
          screenshotUrl={screenshotUrl}
          activeTypes={activeTypes}
        />
      </motion.div>

      <EmbedCodeModal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        apiKey={site.api_key}
        pageKey={page.page_key}
        pageName={page.name}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-3 sm:p-4">
      <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}
