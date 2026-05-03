"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EmbedCodeModal } from "./EmbedCodeModal";
import type { Page } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  siteId: string;
  apiKey: string;
  onCreated: (page: Page) => void;
}

export function AddPageModal({ open, onClose, siteId, apiKey, onCreated }: Props) {
  const [name, setName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPage, setCreatedPage] = useState<Page | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/sites/${siteId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, page_url: pageUrl }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create page");
    } else {
      onCreated(data);
      setCreatedPage(data);
    }
  }

  function handleClose() {
    setName("");
    setPageUrl("");
    setError(null);
    setCreatedPage(null);
    onClose();
  }

  if (createdPage) {
    return (
      <EmbedCodeModal
        open={true}
        onClose={handleClose}
        apiKey={apiKey}
        pageKey={createdPage.page_key}
        pageName={createdPage.name}
      />
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", bounce: 0.25 }}
            className="glass rounded-2xl p-6 w-full max-w-md"
            style={{ boxShadow: "0 0 80px rgba(139,92,246,0.2)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Add Page to Track</h2>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Page Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder='e.g. "Pricing" or "Home"'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Page URL</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://example.com/pricing"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Creating…" : "Create Page & Get Embed Code →"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
