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
      <main className="flex-1 ml-64 relative z-10">
        {children}
      </main>
    </div>
  );
}
