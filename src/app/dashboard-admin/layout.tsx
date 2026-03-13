import React from "react";
import AdminLayoutClient from "./layout-client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch Admin Profile
  const { data: admin } = await supabase
    .from("admins")
    .select("admin_name") // Assuming 'admin_name' exists based on RootLayout usage
    .single();

  const user = {
    name: admin?.admin_name || "Admin",
    id: "ADMIN", // Admins might not need a specific ID shown, or use admin.id if available
    type: "ผู้ดูแลระบบ",
    role: "admin",
  };

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
