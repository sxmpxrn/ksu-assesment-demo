"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  User,
  ShieldUser,
  Info,
} from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, // ส่งเฉพาะชื่อที่กรอกไป API จะไปเติม @ksu.ac.th เอง
          password,
          username,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถสร้างบัญชีได้");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 font-sans selection:bg-ksu/30 overflow-hidden relative py-12">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-ksu/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "3s" }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-sky-300/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="w-full max-w-lg">
        {/* Brand/Logo Section */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center mb-6 group transition-transform hover:scale-110 duration-500">
            <Image src="/logo.png" alt="KSU Logo" width={100} height={100} className="object-contain drop-shadow-xl" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">สมัครสมาชิกใหม่</h1>
          <p className="text-gray-500 font-medium">กรอกข้อมูลเพื่อลงทะเบียนเข้าใช้งานระบบ</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 md:p-12 animate-fade-up delay-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ksu via-emerald-400 to-ksu"></div>

          {success ? (
            /* ✅ หน้าจอเมื่อสมัครสำเร็จ */
            <div className="text-center py-4 space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-lg shadow-green-100/50">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900">ลงทะเบียนสำเร็จ!</h3>
                <p className="text-gray-500 font-medium px-4">
                  {role === "student"
                    ? "บัญชีของคุณถูกสร้างเรียบร้อยแล้ว"
                    : "ข้อมูลของคุณถูกส่งเข้าระบบแล้ว กรุณารอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ"}
                </p>
              </div>

              {/* Email Confirmation Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-left flex items-start gap-4">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0 mt-0.5">
                  <Mail size={22} />
                </div>
                <div>
                  <p className="font-black text-blue-800 text-base mb-1">
                    ยืนยันอีเมลก่อนเข้าใช้งาน
                  </p>
                  <p className="text-blue-700 text-sm font-medium leading-relaxed">
                    ระบบได้ส่งอีเมลยืนยันไปที่อีเมลของคุณแล้ว กรุณา "ยืนยันอีเมล" ก่อนเข้าสู่ระบบ
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  router.refresh();
                  router.push("/login");
                }}
                className="w-full h-16 bg-gradient-to-r from-ksu to-ksu-dark text-white rounded-2xl font-black text-lg shadow-xl shadow-ksu/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <span>ไปหน้าเข้าสู่ระบบ</span>
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleRegister} className="space-y-5">
                {/* Role Selection */}
                <div className="space-y-2 group">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-ksu">
                    ประเภทผู้ใช้งาน
                  </label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-ksu">
                      <ShieldUser size={20} />
                    </div>
                    <select
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-14 pl-14 pr-10 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-ksu focus:bg-white focus:shadow-lg focus:shadow-ksu/5 font-semibold text-gray-800 appearance-none cursor-pointer"
                    >
                      <option value="student">นักศึกษา (Student)</option>
                      <option value="advisor">อาจารย์ที่ปรึกษา (Advisor)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                  {role === "student" && (
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1 ml-1 animate-in fade-in">
                      <CheckCircle2 size={12} /> ระบบจะอนุมัติบัญชีนักศึกษาให้โดยอัตโนมัติ
                    </p>
                  )}
                  {role === "advisor" && (
                    <p className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-1 ml-1 animate-in fade-in">
                      <Info size={12} /> บัญชีอาจารย์จะต้องรอรับการอนุมัติจากผู้ดูแลระบบ
                    </p>
                  )}
                </div>

                {/* Username Field */}
                <div className="space-y-2 group">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-ksu">
                    ชื่อผู้ใช้งาน / รหัสนักศึกษา
                  </label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-ksu">
                      <User size={20} />
                    </div>
                    <input
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="กรอกรหัสนักศึกษา หรือ ชื่อผู้ใช้"
                      required
                      className="w-full h-14 pl-14 pr-5 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-ksu focus:bg-white focus:shadow-lg focus:shadow-ksu/5 font-semibold text-gray-800 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2 group">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-ksu">
                    อีเมลมหาวิทยาลัย (ระบุเฉพาะชื่อ)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-5 text-gray-400">
                      <Mail size={20} />
                    </div>
                    <input
                      name="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ตัวอย่าง: somchai.k"
                      required
                      className="w-full h-14 pl-14 pr-32 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-ksu focus:bg-white font-semibold text-gray-800"
                    />
                    <div className="absolute right-5 text-gray-400 font-bold text-sm pointer-events-none">
                      @ksu.ac.th
                    </div>
                  </div>
                </div>

                {/* Password Fields */}
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 group">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-ksu">รหัสผ่าน</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18} /></div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="อย่างน้อย 6 ตัว"
                        required
                        className="w-full h-14 pl-12 pr-4 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-ksu focus:bg-white font-semibold text-gray-800"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-ksu">ยืนยันรหัสผ่าน</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><CheckCircle2 size={18} /></div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="กรอกอีกครั้ง"
                        required
                        className="w-full h-14 pl-12 pr-4 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-ksu focus:bg-white font-semibold text-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-sm font-bold">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-gradient-to-r from-ksu to-ksu-dark text-white rounded-2xl font-black text-lg shadow-xl shadow-ksu/20 hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <span>ยืนยันการสมัคร</span>}
                </button>
              </form>

              {/* ส่วนท้ายแสดงเฉพาะตอนที่ยังสมัครไม่สำเร็จ */}
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-500 font-medium mb-4">มีบัญชีผู้ใช้งานอยู่แล้ว?</p>
                <button
                  onClick={() => router.push("/login")}
                  className="inline-flex items-center gap-2 text-ksu font-bold hover:text-ksu-dark hover:underline transition-all"
                >
                  <ArrowLeft size={18} />
                  กลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}