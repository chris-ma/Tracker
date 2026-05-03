import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createSupabaseServiceRole();
  const { data, error } = await db
    .from("pages")
    .select("*, screenshots(storage_path, captured_at), sessions(count)")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, page_url } = await req.json();
  if (!name || !page_url) return NextResponse.json({ error: "name and page_url required" }, { status: 400 });

  const db = createSupabaseServiceRole();
  const { data, error } = await db
    .from("pages")
    .insert({ site_id: siteId, name, page_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
