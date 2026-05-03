"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  pageKey: string;
  pageName: string;
}

export function EmbedCodeModal({ open, onClose, apiKey, pageKey, pageName }: Props) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourapp.vercel.app";
  const code = `<script\n  src="${baseUrl}/tracker.js"\n  data-api-key="${apiKey}"\n  data-page-key="${pageKey}"\n  data-eye-tracking="true"\n  async\n></script>`;

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", bounce: 0.25 }}
            className="glass rounded-2xl p-6 w-full max-w-lg"
            style={{ boxShadow: "0 0 80px rgba(139,92,246,0.2)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Embed Code</h2>
                <p className="text-white/50 text-sm">{pageName}</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-white/60 text-sm mb-3">
              Paste this snippet in the <code className="text-purple-400">&lt;head&gt;</code> of your page.
            </p>

            <div className="relative">
              <pre
                className="rounded-xl p-4 text-sm font-mono overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", color: "#a78bfa" }}
              >
                <code>{code}</code>
              </pre>
              <button
                onClick={copy}
                className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: copied ? "rgba(6,182,212,0.2)" : "rgba(139,92,246,0.2)",
                  border: `1px solid ${copied ? "rgba(6,182,212,0.4)" : "rgba(139,92,246,0.4)"}`,
                  color: copied ? "#06b6d4" : "#a78bfa",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-xs text-white/50">
                Remove <code className="text-purple-400">data-eye-tracking=&quot;true&quot;</code> to disable eye tracking for this page.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
