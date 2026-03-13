import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/header"; // ปรับ path ให้ตรงกับไฟล์ Header ของคุณ
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server"; // ปรับ path ให้ตรงกับไฟล์ของคุณ

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KSU Assessment",
  description: "ระบบบริหารจัดการประเมินผลนักศึกษา",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. ดึงข้อมูล Cookie และสร้าง Supabase Client
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 2. ดึงข้อมูล User ปัจจุบันจากระบบ Auth
  const { data: { user } } = await supabase.auth.getUser();

  // 3. จัดเตรียมข้อมูล (Format) ให้ตรงกับที่ Header ต้องการรับ
  let userData = null;
  if (user) {
    userData = {
      // ดึง username จาก user_metadata (หรือใช้อีเมลแทนถ้าไม่มี)
      name: user.user_metadata?.username || user.email || "Unknown User",
      // อาจจะดึงรหัสนักศึกษา/อาจารย์จาก metadata หรือใช้ ID ของระบบไปก่อน
      id: user.user_metadata?.username || user.id.substring(0, 8), 
      // ดึง role เพื่อเอาไปจัดเมนู
      type: user.user_metadata?.role === 'student' ? 'นักศึกษา' 
          : user.user_metadata?.role === 'advisor' ? 'อาจารย์ที่ปรึกษา'
          : user.user_metadata?.role === 'admin' ? 'ผู้ดูแลระบบ'
          : user.user_metadata?.role === 'executives' ? 'ผู้บริหาร'
          : 'ผู้ใช้งาน',
      role: user.user_metadata?.role || "student",
    };
  }

  return (
    <html lang="th">
      <body className={inter.className}>
        {/* 4. ส่ง userData เข้าไปที่ Props user ของ Header */}
        <Header user={userData} />
        
        <main>{children}</main>
      </body>
    </html>
  );
}