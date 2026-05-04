import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/lib/supabase-server";
import { createHash } from "crypto";

export const maxDuration = 30;

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
    const { apiKey, pageKey, imageBase64 } = body;

    if (!apiKey || !pageKey || !imageBase64) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: CORS });
    }

    const db = createSupabaseServiceRole();

    const { data: site } = await db
      .from("sites")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Invalid api_key" }, { status: 401, headers: CORS });
    }

    const { data: page } = await db
      .from("pages")
      .select("id, page_url")
      .eq("page_key", pageKey)
      .eq("site_id", site.id)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Invalid page_key" }, { status: 401, headers: CORS });
    }

    // Strip data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const urlHash = createHash("md5").update(page.page_url).digest("hex");
    const storagePath = `${site.id}/${urlHash}.png`;

    const { error: uploadError } = await db.storage
      .from("screenshots")
      .upload(storagePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500, headers: CORS });
    }

    await db
      .from("screenshots")
      .upsert(
        { page_id: page.id, storage_path: storagePath, captured_at: new Date().toISOString() },
        { onConflict: "page_id" }
      );

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
