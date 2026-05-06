import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase-server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  // Verify admin session
  const auth = await createSupabaseServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const db = createSupabaseServiceRole();

  // Delete events first (FK references sessions), then sessions
  const { error: eventsError } = await db.from("events").delete().eq("page_id", pageId);
  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  const { error: sessionsError } = await db.from("sessions").delete().eq("page_id", pageId);
  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
