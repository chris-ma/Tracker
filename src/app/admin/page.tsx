import Link from "next/link";
import { createSupabaseServiceRole } from "@/lib/supabase-server";
import { TiltCard } from "@/components/TiltCard";
import type { Site } from "@/lib/types";

async function getSites() {
  const db = createSupabaseServiceRole();
  const { data } = await db
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Site[];
}

async function getSessionCount(siteId: string) {
  const db = createSupabaseServiceRole();
  const { count } = await db
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return count ?? 0;
}

export default async function AdminDashboard() {
  const sites = await getSites();
  const counts = await Promise.all(sites.map((s) => getSessionCount(s.id)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Your tracked sites at a glance</p>
        </div>
        <Link href="/admin/sites/new" className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Site
        </Link>
      </div>

      {sites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sites.map((site, i) => (
            <TiltCard key={site.id} intensity={6}>
              <Link href={`/admin/sites/${site.id}`}>
                <div
                  className="glass rounded-2xl p-6 cursor-pointer transition-all duration-300 group"
                  style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.3)" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.3)" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 3c-3 3-4 6-4 9s1 6 4 9M12 3c3 3 4 6 4 9s-1 6-4 9M3 12h18" />
                      </svg>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="text-white/20 group-hover:text-white/60 transition-colors"
                    >
                      <path d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </div>

                  <h2 className="font-bold text-white text-lg mb-0.5">{site.name}</h2>
                  <p className="text-white/40 text-sm mb-5">{site.domain}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold gradient-text">{counts[i]}</p>
                      <p className="text-xs text-white/40">sessions (7d)</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-xs text-white/40">Since</p>
                      <p className="text-sm text-white/60">{new Date(site.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="#8B5CF6" strokeWidth="1.5" />
          <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No sites yet</h2>
      <p className="text-white/40 text-sm mb-6 max-w-sm">
        Add your first site to start tracking eye movements, mouse activity, and clicks.
      </p>
      <Link href="/admin/sites/new" className="btn-primary">
        Add your first site
      </Link>
    </div>
  );
}
