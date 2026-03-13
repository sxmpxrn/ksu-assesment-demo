import { createClient } from "@/utils/supabase/server"; 
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // รับค่า email (เฉพาะชื่อข้างหน้า), password, username, role มาจากหน้าบ้าน
    const { email, password, username, role } = await request.json();

    // 1. ตรวจสอบ Role
    const allowedRoles = ['student', 'advisor', 'admin', 'executives'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "ประเภทผู้ใช้งาน (Role) ไม่ถูกต้อง" }, { status: 400 });
    }

    // 2. จัดการ Email: ตรวจสอบว่าผู้ใช้ไม่ได้ใส่ @ มาเอง แล้วเติมโดเมนให้
    if (!email || email.includes('@')) {
      return NextResponse.json({ error: "กรุณาระบุเฉพาะชื่ออีเมล (ไม่ต้องใส่ @ksu.ac.th)" }, { status: 400 });
    }

    // 🌟 บังคับ Fix Domain ต่อท้ายชื่ออีเมลที่ส่งมา
    const finalEmail = `${email.trim().toLowerCase()}@ksu.ac.th`;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 3. สมัครสมาชิกพร้อมแนบ Metadata (ส่งทั้ง username และ role ไปเก็บ)
    const { data, error } = await supabase.auth.signUp({
      email: finalEmail, // ใช้อีเมลที่ประกอบร่างเสร็จแล้ว
      password,
      options: {
        data: {
          username: username.trim(),
          role: role, 
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { 
        message: "Register successful", 
        user: data.user,
        email: finalEmail 
      },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}