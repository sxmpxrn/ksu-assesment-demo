import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_ANON_KEY; 

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { pathname } = request.nextUrl;

  // 1. ปล่อยผ่านไฟล์ระบบ API, รูปภาพ, CSS ไปเลย ไม่ต้องเช็คสิทธิ์ให้เปลืองทรัพยากร
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') || 
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  // ดึงข้อมูล User ปัจจุบัน
  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/register";
  const isWaitingRoute = pathname === "/waiting-for-confirm";

  // ==========================================
  // ด่านที่ 1: ถ้ายังไม่ได้ Login
  // ==========================================
  if (!user) {
    // ถ้าพยายามเข้าหน้าที่ไม่ใช่หน้าสาธารณะ ให้เด้งไปหน้า Login
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // ==========================================
  // ด่านที่ 2: Login แล้ว -> ดึงข้อมูลจากตาราง Profiles
  // ==========================================
  const { data: profile } = await supabase
    .from("profiles")
    .select("confirm, role")
    .eq("id", user.id)
    .single();

  const isConfirmed = profile?.confirm === true;
  // ถ้าหา Role ไม่เจอ ให้มองเป็น student ไว้ก่อนเพื่อความปลอดภัย
  const userRole = profile?.role || "student"; 

  // ฟังก์ชันแปลง Role เป็นชื่อโฟลเดอร์หลัก
  const getRoleFolder = (role: string) => {
    switch (role) {
      case "admin": return "dashboard-admin";
      case "advisor": return "dashboard-advisor";
      case "executives": return "executives-dashboard";
      case "student": return "dashboard";
      default: return "login";
    }
  };

  // ==========================================
  // ด่านที่ 3: จัดการคนที่ "ยังไม่ได้ Confirm"
  // ==========================================
  if (!isConfirmed) {
    // ถ้าไม่ได้อยู่หน้า waiting ให้เตะไปหน้า waiting ทันที! (ห้ามเข้าหน้าอื่นเด็ดขาด)
    if (!isWaitingRoute) {
      return NextResponse.redirect(new URL("/waiting-for-confirm", request.url));
    }
    // อนุญาตให้อยู่หน้า waiting ต่อไปได้
    return supabaseResponse;
  }

  // ==========================================
  // ด่านที่ 4: คนที่ "Confirm แล้ว" (ตรวจสอบการเข้าถึงข้าม Role)
  // ==========================================
  if (isConfirmed) {
    // 4.1 คนที่ล็อกอินและยืนยันตัวตนแล้ว ไม่ควรกลับไปหน้า login/register/waiting อีก ให้เตะเข้าแดชบอร์ด
    if (isPublicRoute || isWaitingRoute) {
      return NextResponse.redirect(new URL(`/${getRoleFolder(userRole)}`, request.url));
    }

    // หั่น URL เพื่อหาว่าพยายามเข้า "โฟลเดอร์หลัก" อะไรอยู่ 
    // เช่น /dashboard-admin/users -> จะได้คำว่า "dashboard-admin"
    const pathSegments = pathname.split('/').filter(Boolean);
    const rootFolder = pathSegments[0]; // โฟลเดอร์ระดับบนสุด

    // 4.2 กฎเหล็ก: ล็อกสิทธิ์เข้าถึงตาม Role
    if (rootFolder === 'dashboard-admin' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(`/${getRoleFolder(userRole)}`, request.url));
    }
    if (rootFolder === 'dashboard-advisor' && userRole !== 'advisor') {
      return NextResponse.redirect(new URL(`/${getRoleFolder(userRole)}`, request.url));
    }
    if (rootFolder === 'executives-dashboard' && userRole !== 'executives') {
      return NextResponse.redirect(new URL(`/${getRoleFolder(userRole)}`, request.url));
    }
    if (rootFolder === 'dashboard' && userRole !== 'student') {
      return NextResponse.redirect(new URL(`/${getRoleFolder(userRole)}`, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};