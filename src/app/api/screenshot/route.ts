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
    let apiKey: string | null = null;
    let pageKey: string | null = null;
    let imageBuffer: Buffer | null = null;
    let viewportWidth = 0;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      apiKey = formData.get("apiKey") as string | null;
      pageKey = formData.get("pageKey") as string | null;
      viewportWidth = parseInt(formData.get("viewportWidth") as string) || 0;
      const file = formData.get("image") as File | null;
      if (file) imageBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      apiKey = body.apiKey;
      pageKey = body.pageKey;
      viewportWidth = body.viewportWidth || 0;
      if (body.imageBase64) {
        const base64Data = (body.imageBase64 as string).replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
      }
    }

    const deviceType = viewportWidth >= 1024 ? "desktop" : viewportWidth >= 768 ? "tablet" : "mobile";

    if (!apiKey || !pageKey || !imageBuffer) {
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

    const urlHash = createHash("md5").update(page.page_url).digest("hex");
    const storagePath = `${site.id}/${urlHash}_${deviceType}.jpg`;

    // Remove stale file first so the CDN sees a genuine new object
    await db.storage.from("screenshots").remove([storagePath]);

    const { error: uploadError } = await db.storage
      .from("screenshots")
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500, headers: CORS });
    }

    await db
      .from("screenshots")
      .upsert(
        { page_id: page.id, device_type: deviceType, storage_path: storagePath, captured_at: new Date().toISOString() },
        { onConflict: "page_id,device_type" }
      );

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error("[screenshot]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
