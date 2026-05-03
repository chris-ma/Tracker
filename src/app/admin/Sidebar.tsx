"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface Props {
  email: string;
}

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 z-20 flex flex-col"
      style={{
        background: "rgba(8,8,16,0.9)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/admin" className="flex items-center gap-3">
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
        <NavItem href="/admin" label="Dashboard" active={pathname === "/admin"} icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        } />
        <NavItem href="/admin/sites/new" label="Add Site" active={pathname === "/admin/sites/new"} icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        } />
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}>
            {email[0]?.toUpperCase()}
          </div>
          <span className="text-white/50 text-xs truncate flex-1">{email}</span>
        </div>
        <button onClick={signOut} className="btn-ghost w-full justify-center text-xs">
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
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
