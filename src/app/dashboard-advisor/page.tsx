"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  User,
  Settings,
  BookOpen,
  Users,
  GraduationCap,
  CalendarDays,
  Mail,
  ChevronRight,
  MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdvisorProfile() {
  const [advisor, setAdvisor] = useState<any>(null);
  const [managedRooms, setManagedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAdvisorData = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/login";
          return;
        }

        setLoading(true);
        const userId = session.user.id;

        // 1. ดึงข้อมูลโปรไฟล์พื้นฐาน (เพื่อเอาอีเมลและรูปภาพ)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        // 2. ดึงข้อมูลอาจารย์ พร้อม Join สาขา และ คณะ แบบลึก (Deep Join)
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select(`
            title_name,
            first_name,
            last_name,
            majors (
              major_name,
              faculties (
                faculty_name
              )
            )
          `)
          .eq("id", userId)
          .maybeSingle();

        if (teacherError) {
          console.error("รายละเอียด Error การดึงข้อมูลอาจารย์:", JSON.stringify(teacherError, null, 2));
        }

        // 3. ดึงข้อมูลห้องเรียน
        const { data: roomsData } = await supabase
          .from("teacher_relationship")
          .select(`
            rooms (
              id,
              room_code,
              student_count
            )
          `)
          .eq("teacher_id", userId);

        // --- 🛠️ การจัดการโครงสร้างข้อมูลที่ดึงมา ---
        // Supabase จะคืนค่า majors แบบ Object สำหรับ Many-to-One
        const actualMajor = Array.isArray(teacherData?.majors) 
          ? teacherData?.majors[0] 
          : teacherData?.majors;

        const actualFaculty = Array.isArray(actualMajor?.faculties) 
          ? actualMajor?.faculties[0] 
          : actualMajor?.faculties;

        // จัดการชื่อเต็มของอาจารย์
        const title = teacherData?.title_name || "";
        const firstName = teacherData?.first_name || "";
        const lastName = teacherData?.last_name || "";
        const teacherFullName = (firstName && lastName) 
          ? `${title}${firstName} ${lastName}`.trim() 
          : profileData?.username || "ไม่ระบุชื่อ";

        // นำข้อมูลมารวมกันเพื่อเตรียมแสดงผล
        const processedAdvisor = {
          id: userId,
          email: session.user.email || "-",
          full_name: teacherFullName,
          profile_url: profileData?.avatar_url || null,
          major_name: actualMajor?.major_name || "ไม่ระบุสาขาวิชา",
          faculty_name: actualFaculty?.faculty_name || "ไม่ระบุคณะ",
        };

        setAdvisor(processedAdvisor);

        // จัดการข้อมูลห้องเรียน
        if (roomsData) {
          const rooms = roomsData.map((item: any) => item.rooms).filter(Boolean);
          setManagedRooms(rooms);
        }

      } catch (err) {
        console.error("Error fetching advisor profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisorData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#7ca3d5]/20 border-t-[#7ca3d5]"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <User className="text-[#7ca3d5] opacity-50" size={20} />
          </div>
        </div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2rem] shadow-lg shadow-slate-200/50 text-center max-w-md w-full border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลอาจารย์</h2>
          <p className="text-slate-500 mb-8">ระบบไม่สามารถดึงข้อมูลของคุณได้ โปรดลองใหม่อีกครั้ง</p>
          <button onClick={() => router.push("/login")} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors">
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] font-sans pb-24 relative">

      {/* 1. Gradient Cover Banner */}
      <div className="absolute top-0 left-0 right-0 h-64 sm:h-72 bg-gradient-to-br from-[#7ca3d5] via-[#8bbdf0] to-[#6a8ebd] rounded-b-[3rem] shadow-inner overflow-hidden z-0">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 relative z-10">

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12 text-white drop-shadow-md">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Profile & Dashboard</h1>
            <p className="text-white/80 mt-1.5 flex items-center gap-2 font-medium">
              <CalendarDays size={18} />
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* 2. Main Profile Card */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-[#7ca3d5]/10 border border-white flex flex-col lg:flex-row gap-8 lg:gap-12 relative overflow-hidden">

          {/* Avatar Section */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-44 sm:h-44 bg-slate-50 rounded-[2rem] border-4 border-white shadow-lg flex items-center justify-center overflow-hidden text-slate-300 relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-300">
                {advisor.profile_url ? (
                  <img src={advisor.profile_url} alt="Advisor Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} strokeWidth={1.5} />
                )}
              </div>
              <div className="absolute inset-0 bg-[#7ca3d5]/30 blur-xl rounded-full scale-110 z-0"></div>
            </div>

            <span className="mt-6 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#7ca3d5]/10 text-[#7ca3d5] font-bold text-sm rounded-xl border border-[#7ca3d5]/20">
              <Users size={16} /> อาจารย์ประจำสาขา
            </span>
          </div>

          {/* Info Section */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-6 text-center lg:text-left">
              {advisor.full_name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Major */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#7ca3d5]/30 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#7ca3d5]/10 text-[#7ca3d5] flex items-center justify-center shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">สาขาวิชา (Major)</p>
                  <p className="font-bold text-slate-700 leading-tight">{advisor.major_name}</p>
                </div>
              </div>

              {/* Faculty */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#7ca3d5]/30 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">คณะ (Faculty)</p>
                  <p className="font-bold text-slate-700 leading-tight">{advisor.faculty_name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-[#7ca3d5]/30 hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Mail size={24} />
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">อีเมลติดต่อ (Email)</p>
                  <p className="font-bold text-slate-700 leading-tight truncate">{advisor.email}</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-auto flex lg:justify-start justify-center">
              <button
                onClick={() => router.push("/dashboard-advisor/user-setting")}
                className="w-full sm:w-auto px-8 py-4 bg-[#7ca3d5] text-white hover:bg-[#6890c3] transition-all duration-300 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#7ca3d5]/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#7ca3d5]/40 active:translate-y-0"
              >
                <Settings size={20} />
                จัดการข้อมูลส่วนตัว
              </button>
            </div>
          </div>
        </div>

        {/* 3. Managed Classrooms Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-[#7ca3d5] text-white rounded-lg shadow-sm">
                  <Users size={20} />
                </div>
                ห้องเรียนที่ดูแลทั้งหมด
              </h3>
              <p className="text-slate-500 font-medium mt-1 ml-12">รายชื่อห้องเรียนที่ท่านเป็นที่ปรึกษาในภาคการศึกษานี้</p>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-3xl font-black text-[#7ca3d5]">{managedRooms.length}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rooms</span>
            </div>
          </div>

          {managedRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {managedRooms.map((room, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-[1.5rem] border border-slate-100 hover:border-[#7ca3d5]/50 hover:shadow-lg hover:shadow-[#7ca3d5]/10 transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7ca3d5] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-[#7ca3d5]/10 text-slate-400 group-hover:text-[#7ca3d5] flex items-center justify-center font-black text-xl transition-colors duration-300 border border-slate-100">
                      {room.room_code ? room.room_code.substring(0, 2) : "RM"}
                    </div>
                    <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Active
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-1">รหัสห้องเรียน</p>
                    <h4 className="text-xl font-black text-slate-800 mb-4">{room.room_code || "ไม่ระบุ"}</h4>

                    <button className="w-full py-2.5 bg-slate-50 text-slate-600 hover:bg-[#7ca3d5] hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-300">
                      ดูรายละเอียด <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-5">
                <MapPin size={40} />
              </div>
              <h4 className="text-xl font-black text-slate-700 mb-2">ยังไม่มีข้อมูลห้องเรียน</h4>
              <p className="text-slate-500 font-medium max-w-sm">
                ระบบยังไม่ได้จัดสรรห้องเรียนในการดูแลให้กับคุณ หากมีข้อสงสัยกรุณาติดต่อฝ่ายวิชาการ
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}