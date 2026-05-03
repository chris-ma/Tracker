import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceRole } from "@/lib/supabase-server";
import SiteOverviewClient from "./SiteOverviewClient";
import type { Site, Page } from "@/lib/types";

async function getSiteWithPages(siteId: string) {
  const db = createSupabaseServiceRole();

  const [{ data: site }, { data: pages }] = await Promise.all([
    db.from("sites").select("*").eq("id", siteId).single(),
    db
      .from("pages")
      .select("*, screenshots(storage_path, captured_at)")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false }),
  ]);

  return { site: site as Site | null, pages: (pages ?? []) as (Page & { screenshots: { storage_path: string | null } | null })[] };
}

export default async function SiteOverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site, pages } = await getSiteWithPages(siteId);
  if (!site) notFound();

  // Build screenshot URLs
  const db = createSupabaseServiceRole();
  const pagesWithUrls = pages.map((page) => {
    const storagePath = page.screenshots?.storage_path;
    const screenshotUrl = storagePath
      ? db.storage.from("screenshots").getPublicUrl(storagePath).data.publicUrl
      : null;
    return { ...page, screenshotUrl };
  });

  return <SiteOverviewClient site={site} initialPages={pagesWithUrls} />;
}
