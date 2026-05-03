"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EmbedCodeModal } from "@/components/EmbedCodeModal";
import type { Site, Page, EventType, DateRange } from "@/lib/types";

const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: "mouse_move", label: "Mouse Movement", color: "#06B6D4" },
  { type: "click", label: "Clicks", color: "#8B5CF6" },
  { type: "eye_gaze", label: "Eye Gaze", color: "#FBB124" },
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
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <Link href="/admin" className="hover:text-white/70 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href={`/admin/sites/${site.id}`} className="hover:text-white/70 transition-colors">{site.name}</Link>
        <span>/</span>
        <span className="text-white/70">{page.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{page.name}</h1>
          <a href={page.page_url} target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm mt-1 hover:text-white/60 transition-colors flex items-center gap-1">
            {page.page_url}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M7 7h10v10" /></svg>
          </a>
        </div>
        <button onClick={() => setEmbedOpen(true)} className="btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
          Get Embed Code
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Events" value={stats.total} color="#a78bfa" />
        <StatCard label="Mouse Moves" value={stats.mouse_move} color="#06B6D4" />
        <StatCard label="Clicks" value={stats.click} color="#8B5CF6" />
        <StatCard label="Eye Gaze" value={stats.eye_gaze} color="#FBB124" />
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <DateRangeFilter
          value={currentRange as DateRange}
          onChange={handleRangeChange}
          customFrom={customFrom}
          customTo={customTo}
        />

        {/* Layer toggles */}
        <div className="flex items-center gap-2 md:ml-auto flex-wrap">
          {EVENT_TYPES.map(({ type, label, color }) => {
            const active = activeTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? color + "66" : "rgba(255,255,255,0.08)"}`,
                  color: active ? color : "rgba(255,255,255,0.4)",
                  boxShadow: active ? `0 0 16px ${color}33` : "none",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: active ? color : "rgba(255,255,255,0.2)" }} />
                {label}
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
    <div className="glass rounded-xl p-4">
      <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}
