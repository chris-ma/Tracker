"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create site");
    } else {
      router.push(`/admin/sites/${data.id}`);
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <Link href="/admin" className="text-white/40 text-sm hover:text-white/70 transition-colors flex items-center gap-1.5 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Dashboard
        </Link>
        <h1 className="text-3xl font-bold gradient-text">Add New Site</h1>
        <p className="text-white/40 text-sm mt-1">Register a site to start generating embed codes</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.1)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Site Name</label>
            <input
              type="text"
              className="input-field"
              placeholder='e.g. "My SaaS Landing"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Domain</label>
            <input
              type="text"
              className="input-field"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <p className="text-white/30 text-xs mt-1.5">No protocol, no trailing slash</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Creating…" : "Create Site →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
