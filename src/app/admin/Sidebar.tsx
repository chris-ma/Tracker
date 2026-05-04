"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface Props {
  email: string;
}

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function close() { setOpen(false); }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link href="/admin" onClick={close} className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white" />
              <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg">Tracker</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <NavItem href="/admin" label="Dashboard" active={pathname === "/admin"} onClick={close} icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        } />
        <NavItem href="/admin/sites/new" label="Add Site" active={pathname === "/admin/sites/new"} onClick={close} icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        } />
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}>
            {email[0]?.toUpperCase()}
          </div>
          <span className="text-white/50 text-xs truncate flex-1">{email}</span>
        </div>
        <button onClick={signOut} className="btn-ghost w-full justify-center text-xs">
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14"
        style={{ background: "rgba(8,8,16,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white" />
              <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-white text-base">Tracker</span>
        </Link>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="drawer"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed left-0 top-0 h-full w-64 z-50"
            style={{ background: "rgba(8,8,16,0.98)", backdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-64 z-20 flex-col"
        style={{ background: "rgba(8,8,16,0.9)", backdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function NavItem({ href, label, active, icon, onClick }: {
  href: string; label: string; active: boolean; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background: active ? "rgba(139,92,246,0.15)" : "transparent",
        color: active ? "#a78bfa" : "rgba(255,255,255,0.5)",
        borderLeft: active ? "2px solid #8B5CF6" : "2px solid transparent",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
