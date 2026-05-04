"use client";

import { useEffect, useRef, useState } from "react";
import type { EventType, HeatmapPoint } from "@/lib/types";

interface Props {
  events: { event_type: EventType; x: number; y: number }[];
  screenshotUrl: string | null;
  activeTypes: EventType[];
}

const TYPE_CONFIG: Record<EventType, { gradient: Record<string, string>; radius: number; maxOpacity: number }> = {
  mouse_move: {
    gradient: { "0.0": "rgba(6,182,212,0)", "0.5": "rgba(6,182,212,0.5)", "1.0": "rgba(6,182,212,1)" },
    radius: 20,
    maxOpacity: 0.7,
  },
  click: {
    gradient: { "0.0": "rgba(139,92,246,0)", "0.5": "rgba(139,92,246,0.6)", "1.0": "rgba(139,92,246,1)" },
    radius: 30,
    maxOpacity: 0.9,
  },
  eye_gaze: {
    gradient: { "0.0": "rgba(251,191,36,0)", "0.5": "rgba(251,191,36,0.5)", "1.0": "rgba(251,191,36,1)" },
    radius: 25,
    maxOpacity: 0.75,
  },
  scroll: {
    gradient: { "0.0": "rgba(52,211,153,0)", "0.5": "rgba(52,211,153,0.45)", "1.0": "rgba(52,211,153,1)" },
    radius: 40,
    maxOpacity: 0.6,
  },
};

export function HeatmapCanvas({ events, screenshotUrl, activeTypes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasEvents = events.filter((e) => activeTypes.includes(e.event_type)).length > 0;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const filtered = events.filter((e) => activeTypes.includes(e.event_type));
    if (!filtered.length) return;

    const byType: Record<EventType, HeatmapPoint[]> = {
      mouse_move: [],
      click: [],
      eye_gaze: [],
      scroll: [],
    };

    filtered.forEach((e) => {
      byType[e.event_type].push({ x: e.x * W, y: e.y * H, value: 1 });
    });

    activeTypes.forEach((type) => {
      const points = byType[type];
      if (!points.length) return;
      const cfg = TYPE_CONFIG[type];
      drawHeatmapLayer(ctx, points, cfg.radius, cfg.gradient, cfg.maxOpacity, W, H);
    });
  }, [events, activeTypes, imgLoaded]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        minHeight: 500,
        background: screenshotUrl ? "rgba(0,0,0,0.3)" : "#ffffff",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {screenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={screenshotUrl}
          alt="Page screenshot"
          className="w-full h-auto block"
          onLoad={() => setImgLoaded(true)}
          style={{ display: "block" }}
        />
      ) : (
        // White placeholder — heatmap still renders on top via the canvas
        <div style={{ height: 600 }} />
      )}

      {/* Heatmap canvas — renders over screenshot or white background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: screenshotUrl ? "screen" : "normal" }}
      />

      {/* No screenshot badge — only shown when there are no events either, so it doesn't overlap the heatmap */}
      {!screenshotUrl && !hasEvents && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#FBB124" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            No screenshot captured yet
          </div>
          <p className="text-white/30 text-xs text-center max-w-xs px-4">
            Visit the tracked page and stay for 3–5 seconds. Check the browser console for <code className="text-white/50">[Tracker]</code> logs if it still does not appear.
          </p>
        </div>
      )}

      {/* Small corner badge when screenshot is missing but data exists */}
      {!screenshotUrl && hasEvents && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", color: "#FBB124" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          No screenshot
        </div>
      )}

      {!hasEvents && screenshotUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/30 text-sm glass px-4 py-2 rounded-xl">No tracking data for this period</p>
        </div>
      )}
    </div>
  );
}

function drawHeatmapLayer(
  ctx: CanvasRenderingContext2D,
  points: HeatmapPoint[],
  radius: number,
  gradientColors: Record<string, string>,
  maxOpacity: number,
  W: number,
  H: number
) {
  // Create off-screen canvas for this layer
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const octx = off.getContext("2d")!;

  // Draw each point as a radial gradient
  points.forEach((p) => {
    const grad = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    Object.entries(gradientColors).forEach(([stop, color]) => {
      grad.addColorStop(parseFloat(stop), color);
    });
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    octx.fill();
  });

  ctx.globalAlpha = maxOpacity;
  ctx.drawImage(off, 0, 0);
  ctx.globalAlpha = 1;
}
