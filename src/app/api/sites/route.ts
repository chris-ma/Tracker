import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createSupabaseServiceRole();
  const { data, error } = await db
    .from("sites")
    .select("*, sessions(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, domain } = await req.json();
  if (!name || !domain) return NextResponse.json({ error: "name and domain required" }, { status: 400 });

  const db = createSupabaseServiceRole();
  const { data, error } = await db
    .from("sites")
    .insert({ name, domain })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
