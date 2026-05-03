"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AddPageModal } from "@/components/AddPageModal";
import { EmbedCodeModal } from "@/components/EmbedCodeModal";
import { TiltCard } from "@/components/TiltCard";
import type { Site, Page } from "@/lib/types";

type PageWithUrl = Page & { screenshotUrl: string | null };

interface Props {
  site: Site;
  initialPages: PageWithUrl[];
}

export default function SiteOverviewClient({ site, initialPages }: Props) {
  const [pages, setPages] = useState<PageWithUrl[]>(initialPages);
  const [addOpen, setAddOpen] = useState(false);
  const [embedPage, setEmbedPage] = useState<PageWithUrl | null>(null);
  const [copied, setCopied] = useState(false);

  function handlePageCreated(page: Page) {
    setPages((prev) => [{ ...page, screenshotUrl: null }, ...prev]);
  }

  function copyApiKey() {
    navigator.clipboard.writeText(site.api_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Link href="/admin" className="text-white/40 text-sm hover:text-white/70 transition-colors flex items-center gap-1.5 mb-6 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{site.name}</h1>
          <p className="text-white/40 text-sm mt-1">{site.domain}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          Add Page
        </button>
      </div>

      {/* Site API key */}
      <div className="glass rounded-xl p-4 mb-8 flex items-center gap-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Site API Key</p>
          <code className="text-purple-300 text-sm font-mono">{site.api_key}</code>
        </div>
        <button
          onClick={copyApiKey}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: copied ? "rgba(6,182,212,0.2)" : "rgba(139,92,246,0.15)",
            border: `1px solid ${copied ? "rgba(6,182,212,0.4)" : "rgba(139,92,246,0.3)"}`,
            color: copied ? "#06b6d4" : "#a78bfa",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Pages grid */}
      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No pages yet</h2>
          <p className="text-white/40 text-sm mb-5 max-w-xs">Add a page to get an embed code and start tracking user interactions.</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary">Add your first page</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pages.map((page) => (
            <TiltCard key={page.id} intensity={5}>
              <div className="glass rounded-2xl overflow-hidden group" style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.3)" }}>
                {/* Thumbnail */}
                <div className="relative h-36 overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                  {page.screenshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.screenshotUrl} alt={page.name} className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(8,8,16,0.9) 100%)" }} />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-0.5">{page.name}</h3>
                  <p className="text-white/40 text-xs mb-4 truncate">{page.page_url}</p>
                  <div className="flex gap-2">
                    <Link href={`/admin/sites/${site.id}/pages/${page.id}`} className="btn-ghost text-xs flex-1 justify-center">
                      View Heatmap
                    </Link>
                    <button
                      onClick={() => setEmbedPage(page)}
                      className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
                    >
                      &lt;/&gt; Embed
                    </button>
                  </div>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      )}

      <AddPageModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        siteId={site.id}
        apiKey={site.api_key}
        onCreated={handlePageCreated}
      />

      {embedPage && (
        <EmbedCodeModal
          open={true}
          onClose={() => setEmbedPage(null)}
          apiKey={site.api_key}
          pageKey={embedPage.page_key}
          pageName={embedPage.name}
        />
      )}
    </div>
  );
}
