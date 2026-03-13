"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server"; // ปรับ path ให้ตรงกับโปรเจกต์คุณ
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // สั่งให้ Supabase เคลียร์ Session ปัจจุบันทิ้ง
  await supabase.auth.signOut();

  // (ทางเลือก) คุณสามารถทำ redirect กลับหน้าแรกจากฝั่ง server ได้เลยตรงนี้
  // แต่ถ้าอยากใช้ window.location.href ที่ฝั่ง client ก็ไม่ต้องใส่บรรทัดล่างครับ
  redirect("/");
}