import { notFound } from "next/navigation";
import { createSupabaseServiceRole } from "@/lib/supabase-server";
import HeatmapPageClient from "./HeatmapPageClient";
import type { Site, Page, TrackerEvent, DeviceType } from "@/lib/types";

async function getPageData(siteId: string, pageId: string) {
  const db = createSupabaseServiceRole();

  const [{ data: site }, { data: page }, { data: screenshot }] = await Promise.all([
    db.from("sites").select("*").eq("id", siteId).single(),
    db.from("pages").select("*").eq("id", pageId).eq("site_id", siteId).single(),
    db.from("screenshots").select("storage_path").eq("page_id", pageId).maybeSingle(),
  ]);

  if (!site || !page) return null;

  const screenshotUrl = screenshot?.storage_path
    ? db.storage.from("screenshots").getPublicUrl(screenshot.storage_path).data.publicUrl
    : null;

  return { site: site as Site, page: page as Page, screenshotUrl };
}

async function getEvents(
  pageId: string,
  device: DeviceType | "all",
  from?: string,
  to?: string
) {
  const db = createSupabaseServiceRole();

  if (device === "all") {
    let q = db
      .from("events")
      .select("event_type, x, y, created_at")
      .eq("page_id", pageId);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    const { data } = await q.limit(50000);
    return (data ?? []) as Pick<TrackerEvent, "event_type" | "x" | "y" | "created_at">[];
  }

  // Filter by device via the sessions join using !inner
  let q = db
    .from("events")
    .select("event_type, x, y, created_at, sessions!inner(device_type)")
    .eq("page_id", pageId)
    .eq("sessions.device_type", device);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);
  const { data } = await q.limit(50000);
  return (data ?? []) as Pick<TrackerEvent, "event_type" | "x" | "y" | "created_at">[];
}

async function getDeviceCounts(pageId: string, from?: string, to?: string) {
  const db = createSupabaseServiceRole();
  let q = db
    .from("sessions")
    .select("device_type")
    .eq("page_id", pageId);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);
  const { data } = await q;
  const counts = { mobile: 0, tablet: 0, desktop: 0 };
  (data ?? []).forEach((s: { device_type: string | null }) => {
    const d = s.device_type as DeviceType | null;
    if (d && d in counts) counts[d]++;
  });
  return counts;
}

export default async function HeatmapPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string; device?: string }>;
}) {
  const { siteId, pageId } = await params;
  const sp = await searchParams;
  const range = sp.range ?? "7d";
  const customFrom = sp.from;
  const customTo = sp.to;
  const device = (sp.device ?? "all") as DeviceType | "all";

  const pageData = await getPageData(siteId, pageId);
  if (!pageData) notFound();

  // Compute date range
  let fromDate: string | undefined;
  let toDate: string | undefined;
  const now = new Date();

  if (range === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (range === "7d") {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (range === "workweek") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    fromDate = monday.toISOString();
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    toDate = friday.toISOString();
  } else if (range === "30d") {
    fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (range === "custom" && customFrom && customTo) {
    fromDate = new Date(customFrom).toISOString();
    toDate = new Date(customTo + "T23:59:59").toISOString();
  }

  const [events, deviceCounts] = await Promise.all([
    getEvents(pageId, device, fromDate, toDate),
    getDeviceCounts(pageId, fromDate, toDate),
  ]);

  const stats = {
    total: events.length,
    mouse_move: events.filter((e) => e.event_type === "mouse_move").length,
    click: events.filter((e) => e.event_type === "click").length,
    eye_gaze: events.filter((e) => e.event_type === "eye_gaze").length,
    scroll: events.filter((e) => e.event_type === "scroll").length,
  };

  return (
    <HeatmapPageClient
      site={pageData.site}
      page={pageData.page}
      screenshotUrl={pageData.screenshotUrl}
      events={events}
      stats={stats}
      currentRange={range}
      currentDevice={device}
      deviceCounts={deviceCounts}
      customFrom={customFrom}
      customTo={customTo}
    />
  );
}
