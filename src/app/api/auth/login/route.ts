import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. [Security - ZAP] ตรวจสอบ Origin / ป้องกัน CSRF
    // เช็คว่า Request นี้ถูกยิงมาจากหน้าเว็บของเราจริงๆ ไม่ใช่เว็บอื่นแอบอ้าง
    const origin = request.headers.get("origin");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; 
    
    // ถ้ามีการส่ง origin มา ต้องตรงกับ URL ของเว็บเราที่ตั้งไว้ใน .env
    if (origin && siteUrl && origin !== siteUrl) {
      return NextResponse.json({ error: "Forbidden - ไม่ได้รับอนุญาต" }, { status: 403 });
    }

    // 2. รับค่าจาก Request
    const { username, password } = await request.json();

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 3. [Security - ZAP] ป้องกัน User Enumeration
    // กำหนดข้อความ Error กลาง เพื่อไม่ให้แฮกเกอร์รู้ว่า Username นี้มีอยู่ในระบบหรือไม่
    const genericErrorMsg = "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";

    // 4. นำ Username ไปค้นหา Email จากฐานข้อมูลผ่านฟังก์ชัน RPC
    // ... โค้ดส่วนดึง RPC ...
    const { data: email, error: rpcError } = await supabase.rpc(
      "get_email_by_username",
      { p_username: username }
    );

    // 🌟 เพิ่มบรรทัดนี้เพื่อดูค่าที่แท้จริงใน Terminal ของ VS Code
    console.log("DEBUG RPC -> Email:", email, "Error:", rpcError);

    if (rpcError || !email) {
      return NextResponse.json({ error: genericErrorMsg }, { status: 401 });
    }

    // ... โค้ดส่วน signInWithPassword ...
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email, 
      password: password,
    });

    // 🌟 เพิ่มบรรทัดนี้เพื่อดูว่ารหัสผ่านผิด หรือมีปัญหาที่ Auth
    console.log("DEBUG AUTH -> Error:", error);
    // ถ้ารหัสผ่านไม่ถูกต้อง -> ส่งข้อความ Error กลาง (ให้เหมือนกรณีด้านบนเป๊ะๆ)
    if (error) {
      return NextResponse.json({ error: genericErrorMsg }, { status: 401 });
    }

    // 6. ล็อกอินสำเร็จ Supabase จะจัดการ Set Cookie ลง Browser ให้เอง
    return NextResponse.json(
      { message: "Login successful", session: data.session },
      { status: 200 }
    );

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}