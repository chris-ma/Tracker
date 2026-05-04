import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import AdminSidebar from "./Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ background: "#080810" }}>
      <div className="aurora-bg" />
      <AdminSidebar email={user.email ?? ""} />
      {/* pt-14 on mobile to clear the fixed top bar; md:ml-64 for desktop sidebar */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 relative z-10 min-w-0">
        {children}
      </main>
    </div>
  );
}
