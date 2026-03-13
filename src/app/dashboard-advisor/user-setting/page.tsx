"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Save,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Loader2,
  Camera,
  Info,
  IdCard,
  Phone,
  Building2,
  GraduationCap,
  ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdvisorSetting() {
  const [profile, setProfile] = useState<any>(null);
  
  // State สำหรับเก็บข้อมูล คณะ และ สาขา
  const [faculties, setFaculties] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileAndMasterData = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        setLoading(true);
        const userId = session.user.id;

        // 1. ดึงข้อมูล Master Data: คณะ และ สาขาทั้งหมด
        const [{ data: facultiesData }, { data: majorsData }] = await Promise.all([
          supabase.from("faculties").select("*").order("id"),
          supabase.from("majors").select("*").order("id")
        ]);

        if (facultiesData) setFaculties(facultiesData);
        if (majorsData) setMajors(majorsData);

        // 2. ดึงข้อมูล Profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        // 3. ดึงข้อมูล Teachers พร้อมกับ Join เพื่อหา faculty_id ปัจจุบัน (เพื่อเซ็ตค่าเริ่มต้นของ Dropdown คณะ)
        const { data: teacherData } = await supabase
          .from("teachers")
          .select(`
            *,
            majors (
              faculty_id
            )
          `)
          .eq("id", userId)
          .maybeSingle();

        const processedData = {
          id: profileData?.id || userId,
          email: session.user.email || "",
          username: profileData?.username || "-",
          role: profileData?.role || "advisor",
          created_at: profileData?.created_at,
          profile_url: profileData?.avatar_url || null,
          
          employee_id: teacherData?.employee_id || "",
          title_name: teacherData?.title_name || "",
          first_name: teacherData?.first_name || "",
          last_name: teacherData?.last_name || "",
          phone: teacherData?.phone || "",
          major_id: teacherData?.major_id || "",
        };

        setProfile(processedData);

        // เซ็ตค่าเริ่มต้นของ Dropdown คณะ ตามสาขาที่เคยบันทึกไว้
        if (teacherData?.majors?.faculty_id) {
          setSelectedFacultyId(teacherData.majors.faculty_id.toString());
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndMasterData();
  }, [router]);

  const handleSave = async () => {
    if (!profile) return;

    if (!profile.employee_id || !profile.first_name || !profile.last_name) {
      setMessage({ text: "กรุณากรอกรหัสอาจารย์, ชื่อ และนามสกุลให้ครบถ้วน", type: "error" });
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const teacherUpdate = {
        id: session.user.id,
        employee_id: profile.employee_id,
        title_name: profile.title_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        major_id: profile.major_id ? parseInt(profile.major_id) : null, // แปลงเป็น Int หรือปล่อยเป็น null
        updated_at: new Date().toISOString(),
      };

      const { error: teacherError } = await supabase
        .from("teachers")
        .upsert(teacherUpdate);

      if (teacherError) throw teacherError;

      const fullName = `${profile.title_name}${profile.first_name} ${profile.last_name}`.trim();
      await supabase
        .from("profiles")
        .update({ username: fullName, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

      setMessage({ text: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว", type: "success" });
      setTimeout(() => setMessage(null), 3500);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage({
        text: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล (รหัสอาจารย์อาจซ้ำกัน)",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayFullName = profile?.first_name 
    ? `${profile.title_name || ''}${profile.first_name} ${profile.last_name}`
    : profile?.username;

  // ฟังก์ชันกรองสาขาตามคณะที่เลือก
  const filteredMajors = majors.filter(
    (m) => m.faculty_id.toString() === selectedFacultyId
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#7ca3d5] mb-4" />
        <p className="text-slate-500 font-medium">กำลังเตรียมหน้าการตั้งค่า...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2rem] shadow-sm text-center max-w-md w-full border border-slate-200">
          <ShieldCheck size={48} className="mx-auto text-red-400 mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">เข้าสู่ระบบไม่สำเร็จ</h2>
          <p className="text-slate-500 mb-8">ไม่พบข้อมูลของคุณในระบบ โปรดเข้าสู่ระบบใหม่อีกครั้ง</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            ไปที่หน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 selection:bg-[#7ca3d5]/30 selection:text-[#5a80b0]">
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/dashboard-advisor"
            className="flex items-center gap-2 text-slate-500 hover:text-[#7ca3d5] font-semibold transition-colors group"
          >
            <div className="p-1.5 rounded-lg group-hover:bg-[#7ca3d5]/10 transition-colors">
              <ArrowLeft size={18} />
            </div>
            กลับหน้าโปรไฟล์
          </Link>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Settings
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="px-6 sm:px-10 py-8 border-b border-slate-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                ตั้งค่าบัญชี
              </h1>
              <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">
                จัดการข้อมูลส่วนบุคคล สังกัด และการตั้งค่าระบบของคุณ
              </p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
              <Settings size={24} />
            </div>
          </div>

          <div className="px-6 sm:px-10 py-8 space-y-10">
            
            {/* 1. Profile Picture Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                รูปโปรไฟล์ (Profile Picture)
              </h3>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[1.5rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden text-slate-300 relative z-10 group-hover:border-[#7ca3d5]/50 transition-colors">
                    {profile.profile_url ? (
                      <img
                        src={profile.profile_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-[1.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20 backdrop-blur-sm">
                    <Camera className="text-white" size={28} />
                  </div>
                </div>
                
                <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
                  <h4 className="text-lg font-bold text-slate-800 mb-1">{displayFullName}</h4>
                  <p className="text-sm text-slate-500 font-medium mb-4">{profile.role === 'advisor' ? 'อาจารย์ที่ปรึกษา' : profile.role}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:border-[#7ca3d5] hover:text-[#7ca3d5] transition-colors shadow-sm flex items-center gap-2">
                      <ImageIcon size={16} /> อัปโหลดรูปใหม่
                    </button>
                    <button className="px-4 py-2 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors">
                      ลบรูปภาพ
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 font-medium">แนะนำขนาด 800x800px ไฟล์ .JPG หรือ .PNG ขนาดไม่เกิน 2MB</p>
                </div>
              </div>
            </section>

            {/* 2. Personal Information Form */}
            <section>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                ข้อมูลพื้นฐาน (Basic Information)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Employee ID */}
                <div className="md:col-span-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    รหัสประจำตัวอาจารย์ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <IdCard size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.employee_id || ""}
                      onChange={(e) => setProfile({ ...profile, employee_id: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none placeholder-slate-400"
                      placeholder="เช่น T10001"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="md:col-span-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์โทรศัพท์</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Phone size={18} />
                    </div>
                    <input
                      type="text"
                      value={profile.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none placeholder-slate-400"
                      placeholder="เช่น 0812345678"
                    />
                  </div>
                </div>

                {/* Title Name */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-2">คำนำหน้าชื่อ</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.title_name || ""}
                      onChange={(e) => setProfile({ ...profile, title_name: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none placeholder-slate-400"
                      placeholder="เช่น ผศ.ดร."
                    />
                  </div>
                </div>

                {/* First Name */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    ชื่อจริง <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.first_name || ""}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none placeholder-slate-400"
                      placeholder="ชื่อจริง"
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div className="md:col-span-5">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.last_name || ""}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none placeholder-slate-400"
                      placeholder="นามสกุล"
                    />
                  </div>
                </div>

                {/* ---------------- เพิ่มส่วน Dropdown หน่วยงาน ---------------- */}
                <div className="md:col-span-12 mt-4 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                    สังกัดหน่วยงาน (Department & Major)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Faculty Dropdown */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">คณะ (Faculty)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Building2 size={18} />
                        </div>
                        <select
                          value={selectedFacultyId}
                          onChange={(e) => {
                            setSelectedFacultyId(e.target.value);
                            setProfile({ ...profile, major_id: "" }); // เมื่อเปลี่ยนคณะ ให้รีเซ็ตสาขาเป็นค่าว่าง
                          }}
                          className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm transition-all focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 outline-none appearance-none cursor-pointer"
                        >
                          <option value="">-- กรุณาเลือกคณะ --</option>
                          {faculties.map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.faculty_name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Major Dropdown */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">สาขาวิชา (Major)</label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${selectedFacultyId ? 'text-slate-400' : 'text-slate-300'}`}>
                          <GraduationCap size={18} />
                        </div>
                        <select
                          value={profile.major_id || ""}
                          onChange={(e) => setProfile({ ...profile, major_id: e.target.value })}
                          disabled={!selectedFacultyId} // ปิดการใช้งานหากยังไม่เลือกคณะ
                          className={`w-full pl-11 pr-10 py-3.5 border rounded-xl font-semibold text-sm transition-all outline-none appearance-none ${
                            !selectedFacultyId 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 cursor-pointer'
                          }`}
                        >
                          <option value="">-- กรุณาเลือกสาขาวิชา --</option>
                          {filteredMajors.map((major) => (
                            <option key={major.id} value={major.id}>
                              {major.major_name}
                            </option>
                          ))}
                        </select>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${selectedFacultyId ? 'text-slate-400' : 'text-slate-300'}`}>
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* 3. System Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  ข้อมูลระบบ (System Data)
                </h3>
                <div className="group relative cursor-help">
                  <Info size={14} className="text-slate-400" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] text-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    ข้อมูลส่วนนี้แก้ไขไม่ได้ หากต้องการเปลี่ยนกรุณาติดต่อ Admin
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 shrink-0">
                    <Mail size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-0.5">อีเมลบัญชีผู้ใช้</p>
                    <p className="font-bold text-slate-800 truncate text-sm">{profile.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={12} /> ยืนยันแล้ว
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-0.5">เข้าร่วมเมื่อ</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <div className="px-6 sm:px-10 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="w-full sm:w-auto">
              {message && (
                <div className={`flex items-center justify-center sm:justify-start gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2 ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {message.type === 'success' ? <ShieldCheck size={18} /> : <Info size={18} />}
                  {message.text}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.push("/dashboard-advisor")}
                className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-8 py-3 text-sm font-bold text-white bg-[#7ca3d5] border border-[#6b90be] rounded-xl hover:bg-[#6b90be] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#7ca3d5]/30 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}