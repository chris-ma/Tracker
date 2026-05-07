"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { EventType, HeatmapPoint } from "@/lib/types";

interface Props {
  events: { event_type: EventType; x: number; y: number }[];
  screenshotUrl: string | null;
  activeTypes: EventType[];
  pageScrollHeight?: number;
  pageViewportWidth?: number;
  screenshotViewportWidth?: number;
  screenshotPageHeight?: number;
}

const TYPE_CONFIG: Record<EventType, { gradient: Record<string, string>; radius: number; maxOpacity: number }> = {
  mouse_move: {
    gradient: { "0.0": "rgba(6,182,212,1)", "0.5": "rgba(6,182,212,0.35)", "1.0": "rgba(6,182,212,0)" },
    radius: 8,
    maxOpacity: 0.7,
  },
  click: {
    gradient: { "0.0": "rgba(139,92,246,1)", "0.5": "rgba(139,92,246,0.4)", "1.0": "rgba(139,92,246,0)" },
    radius: 14,
    maxOpacity: 0.9,
  },
  eye_gaze: {
    gradient: { "0.0": "rgba(251,191,36,1)", "0.5": "rgba(251,191,36,0.35)", "1.0": "rgba(251,191,36,0)" },
    radius: 10,
    maxOpacity: 0.85,
  },
  scroll: {
    gradient: { "0.0": "rgba(52,211,153,1)", "0.5": "rgba(52,211,153,0.35)", "1.0": "rgba(52,211,153,0)" },
    radius: 16,
    maxOpacity: 0.6,
  },
  long_press: {
    gradient: { "0.0": "rgba(251,113,133,1)", "0.5": "rgba(251,113,133,0.4)", "1.0": "rgba(251,113,133,0)" },
    radius: 14,
    maxOpacity: 0.85,
  },
  pinch: {
    gradient: { "0.0": "rgba(249,168,212,1)", "0.5": "rgba(249,168,212,0.35)", "1.0": "rgba(249,168,212,0)" },
    radius: 12,
    maxOpacity: 0.7,
  },
  double_tap: {
    gradient: { "0.0": "rgba(253,186,116,1)", "0.5": "rgba(253,186,116,0.4)", "1.0": "rgba(253,186,116,0)" },
    radius: 13,
    maxOpacity: 0.88,
  },
};

export function HeatmapCanvas({ events, screenshotUrl, activeTypes, pageScrollHeight, pageViewportWidth, screenshotViewportWidth, screenshotPageHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Reset when the screenshot URL changes so a stale size doesn't linger.
  const prevScreenshotUrl = useRef(screenshotUrl);
  if (prevScreenshotUrl.current !== screenshotUrl) {
    prevScreenshotUrl.current = screenshotUrl;
    setImgNaturalSize(null);
    setImgLoaded(false);
  }

  const hasEvents = events.filter((e) => activeTypes.includes(e.event_type)).length > 0;

  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;
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
      long_press: [],
      pinch: [],
      double_tap: [],
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
  }, [events, activeTypes]);

  // Redraw whenever events/types change or image loads
  useEffect(() => {
    draw();
  }, [draw, imgLoaded]);

  // Redraw when container is resized (handles image load changing container height)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // Priority: screenshot's own stored dimensions (exact capture size) → screenshot
  // natural size from onLoad → session-derived page dims → undefined (min-height fallback).
  const aspectRatio =
    screenshotViewportWidth && screenshotPageHeight && screenshotViewportWidth > 0 && screenshotPageHeight > 0
      ? `${screenshotViewportWidth} / ${screenshotPageHeight}`
      : imgNaturalSize
      ? `${imgNaturalSize.w} / ${imgNaturalSize.h}`
      : pageScrollHeight && pageViewportWidth && pageScrollHeight > 0 && pageViewportWidth > 0
      ? `${pageViewportWidth} / ${pageScrollHeight}`
      : undefined;
  const hasAspectRatio = aspectRatio !== undefined;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl"
      style={{
        aspectRatio,
        minHeight: hasAspectRatio ? undefined : 500,
        background: screenshotUrl ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {screenshotUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl}
          alt="Page screenshot"
          onLoad={(e) => {
            const img = e.currentTarget;
            setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            setImgLoaded(true);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
          }}
        />
      )}

      {/* Heatmap canvas — renders over screenshot or background */}
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
