import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, pageKey, sessionId, pageUrl, viewportWidth, viewportHeight, pageScrollHeight, events, endedAt } = body;

    if (!apiKey || !pageKey) {
      return NextResponse.json({ error: "Missing keys" }, { status: 400, headers: CORS });
    }

    const db = createSupabaseServiceRole();

    // Validate site API key
    const { data: site } = await db
      .from("sites")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Invalid api_key" }, { status: 401, headers: CORS });
    }

    // Validate page key
    const { data: page } = await db
      .from("pages")
      .select("id")
      .eq("page_key", pageKey)
      .eq("site_id", site.id)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Invalid page_key" }, { status: 401, headers: CORS });
    }

    // Create session if this is the first batch (no sessionId yet)
    let resolvedSessionId = sessionId;
    if (!sessionId) {
      const { data: session } = await db
        .from("sessions")
        .insert({
          site_id: site.id,
          page_id: page.id,
          page_url: pageUrl,
          viewport_width: viewportWidth ?? 0,
          viewport_height: viewportHeight ?? 0,
          page_scroll_height: pageScrollHeight ?? null,
          user_agent: req.headers.get("user-agent"),
        })
        .select("id")
        .single();
      resolvedSessionId = session?.id;
    }

    // Bulk insert events
    if (events?.length > 0) {
      const rows = events.map((e: { type: string; x: number; y: number; ts?: number }) => ({
        session_id: resolvedSessionId,
        site_id: site.id,
        page_id: page.id,
        event_type: e.type,
        x: Math.max(0, Math.min(1, e.x)),
        y: Math.max(0, Math.min(1, e.y)),
      }));
      await db.from("events").insert(rows);
    }

    // Mark session as ended if the page is being hidden
    if (endedAt && resolvedSessionId) {
      await db
        .from("sessions")
        .update({ ended_at: endedAt })
        .eq("id", resolvedSessionId)
        .is("ended_at", null); // don't overwrite if already set
    }

    return NextResponse.json(
      { ok: true, sessionId: resolvedSessionId },
      { headers: CORS }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
