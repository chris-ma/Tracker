"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#080810" }}>
      <div className="aurora-bg" />

      {/* Animated orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", top: "10%", left: "10%" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", bottom: "10%", right: "10%" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)", boxShadow: "0 0 40px rgba(139,92,246,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white" />
              <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to your Tracker admin</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8" style={{ boxShadow: "0 0 60px rgba(139,92,246,0.1)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
