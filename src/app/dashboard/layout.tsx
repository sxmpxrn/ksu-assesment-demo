import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch role from profiles table
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  // Redirect non-student roles to their respective dashboards
  if (profile.role !== "student") {
    if (profile.role === "advisor") {
      redirect("/dashboard-teacher");
    } else if (profile.role === "admin") {
      redirect("/dashboard-admin");
    } else if (profile.role === "executives") {
      redirect("/dashboard-executive");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content Area */}
      <div className="flex-1 md:ml-[280px] /* 280px to match sidebar width */ flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
