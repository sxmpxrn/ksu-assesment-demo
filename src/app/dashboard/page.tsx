"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  User,
  Mail,
  MapPin,
  BookOpen,
  GraduationCap,
  IdCard,
  CalendarDays,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  School,
  FileText,
  Settings,
  Award,
  Clock,
  Phone, // เพิ่มไอคอน Phone
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRoundId } from "@/utils/round-formatter";

type AssessmentStatus = {
  aroundId: number;
  termLabel: string;
  advisorName: string;
  advisorId: number;
  isCompleted: boolean;
};

export default function Profile() {
  const [student, setStudent] = useState<any>(null);
  const [advisorsList, setAdvisorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/login";
          return;
        }

        setLoading(true);
        const userId = session.user.id;

        // Fetch User Profile Data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        // Fetch Student Data Details (rooms, majors, faculties)
        const { data: studentData } = await supabase
          .from("students")
          .select(
            `
            *,
            rooms:room_id (
              id,
              room_code,
              majors (
                major_name,
                faculties (
                  faculty_name
                )
              )
            )
          `,
          )
          .eq("id", userId)
          .single();

        let advisors: any[] = [];

        // Fetch อาจารย์ประจำห้อง (ดึงข้อมูลแบบ Deep Join จาก teachers และ profiles)
        if (studentData?.rooms?.id) {
          const { data: relationData, error: relationError } = await supabase
            .from("teacher_relationship")
            .select(`
                teachers (
                  id,
                  title_name,
                  first_name,
                  last_name,
                  phone,
                  profiles (
                    username
                  )
                )
              `)
            .eq("room_id", studentData.rooms.id);

          // เพิ่มบรรทัดนี้เพื่อเช็คว่า Database อนุญาตให้ดึงมาแล้วหรือยัง
          if (relationError) {
            console.error("Error fetching advisors (Detailed):", JSON.stringify(relationError, null, 2));
          }

          if (relationData) {
            advisors = relationData
              .map((item: any) => {
                // จัดการโครงสร้าง Array/Object ที่ส่งกลับมาจาก Supabase
                const t = Array.isArray(item.teachers) ? item.teachers[0] : item.teachers;
                if (!t) return null;

                const p = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;

                const title = t.title_name || "";
                const first = t.first_name || "";
                const last = t.last_name || "";
                const fullName = `${title}${first} ${last}`.trim();

                return {
                  id: t.id,
                  fullName: fullName !== "" ? fullName : (p?.username || "ไม่ระบุชื่ออาจารย์"),
                  phone: t.phone || "-",
                  avatar_url: p?.avatar_url || null,
                  username: p?.username || "-",
                };
              })
              .filter(Boolean);
          }
        }
        setAdvisorsList(advisors);

        // รวมชื่อและนามสกุลจากโครงสร้าง DB ใหม่
        const fullName = (studentData?.first_name && studentData?.last_name)
          ? `${studentData.first_name} ${studentData.last_name}`
          : profileData?.username || "-";

        const processedData = {
          id: profileData?.id || userId,
          email: session.user.email || "",
          username: profileData?.username || "-",
          role: profileData?.role || "นักศึกษา",
          created_at: profileData?.created_at,
          full_name: fullName,
          student_id: studentData?.student_id || null,
          room_code: studentData?.rooms?.room_code || null,
          major_name: studentData?.rooms?.majors?.major_name || null,
          faculty_name:
            studentData?.rooms?.majors?.faculties?.faculty_name || null,
          profile_url: profileData?.avatar_url || null,
          confirm_status: studentData?.confirm || false, // ดึงค่าการยืนยันจากอาจารย์
        };

        setStudent(processedData);

        // Fetch Assessments
        if (
          profileData?.role === "student" ||
          processedData.role === "นักศึกษา"
        ) {
          const now = new Date().toISOString();

          const { data: details } = await supabase
            .from("assessment_detail")
            .select("around_id, start_date, end_date")
            .lte("start_date", now)
            .gte("end_date", now);

          if (details && details.length > 0) {
            const uniqueRoundsMap = new Map();
            details.forEach((d: any) => {
              if (!uniqueRoundsMap.has(d.around_id)) {
                uniqueRoundsMap.set(d.around_id, d);
              }
            });
            const activeRounds = Array.from(uniqueRoundsMap.values());

            // Check completed
            const { data: completedA } = await supabase
              .from("assessment_answer")
              .select("around_id, teacher_id")
              .eq("student_id", userId);

            const completedSet = new Set(
              completedA?.map((a: any) => `${a.around_id}-${a.teacher_id}`) ||
              [],
            );

            const statusList: AssessmentStatus[] = [];
            for (const round of activeRounds as any[]) {
              const termLabel = formatRoundId(round.around_id);

              if (advisors.length > 0) {
                advisors.forEach((adv: any) => {
                  const isDone = completedSet.has(
                    `${round.around_id}-${adv.id}`,
                  );
                  statusList.push({
                    aroundId: round.around_id,
                    termLabel,
                    advisorName: adv.fullName, // ใช้ fullName แทน username
                    advisorId: adv.id,
                    isCompleted: isDone,
                  });
                });
              } else {
                statusList.push({
                  aroundId: round.around_id,
                  termLabel,
                  advisorName: "ไม่มีอาจารย์ที่ปรึกษา",
                  advisorId: 0,
                  isCompleted: false,
                });
              }
            }
            setAssessmentStatus(statusList);
          }
        }
      } catch (err) {
        console.error("Error in profile fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-indigo-600 animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลนักศึกษา</h2>
          <p className="text-slate-500 mb-8">
            โปรดตรวจสอบการเข้าสู่ระบบของคุณ หรือติดต่อผู้ดูแลระบบ
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = assessmentStatus.filter((s) => !s.isCompleted).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 relative overflow-hidden">

      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 relative z-10">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">ภาพรวมแดชบอร์ดส่วนตัว</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm font-medium">
            <CalendarDays size={16} className="text-indigo-500" />
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Profile Card (Sticky) */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-white/60 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">

              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 opacity-90"></div>

              <div className="relative z-10 flex flex-col items-center mt-6">
                <div className="w-32 h-32 bg-white rounded-[2rem] p-2 mb-5 shadow-xl shadow-indigo-600/10 group-hover:scale-105 transition-transform duration-500 -rotate-3 group-hover:rotate-0">
                  <div className="w-full h-full bg-slate-50 rounded-[1.5rem] overflow-hidden border border-slate-100 flex items-center justify-center text-indigo-200">
                    {student.profile_url ? (
                      <img src={student.profile_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={56} strokeWidth={1.5} />
                    )}
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 mb-3">
                  <GraduationCap size={14} /> นักศึกษา
                </span>

                <h2 className="text-2xl font-black text-slate-800 mb-1 text-center">{student.full_name}</h2>
                <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-1.5 mb-6">
                  <Mail size={14} className="text-slate-400" /> {student.email || "ไม่มีข้อมูลอีเมล"}
                </p>

                <div className="w-full grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-slate-50 rounded-2xl py-3 px-2 border border-slate-100 flex flex-col items-center justify-center">
                    <IdCard size={18} className="text-blue-500 mb-1" />
                    <span className="text-[10px] uppercase font-bold text-slate-400">รหัส นศ.</span>
                    <span className="font-black text-slate-800 text-sm tracking-wide">{student.student_id || "-"}</span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl py-3 px-2 border border-slate-100 flex flex-col items-center justify-center">
                    <BookOpen size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[10px] uppercase font-bold text-slate-400">ห้องเรียน</span>
                    <span className="font-black text-slate-800 text-sm">{student.room_code || "N/A"}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/dashboard/user-setting")}
                  className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-slate-900/10"
                >
                  <Settings size={18} /> จัดการโปรไฟล์
                </button>
              </div>
            </div>

            {/* Support Help Block */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden group shadow-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
              <ShieldCheck size={24} className="text-emerald-400 mb-3 relative z-10" />
              <h3 className="text-lg font-bold mb-2 relative z-10">ต้องการความช่วยเหลือ?</h3>
              <p className="text-slate-400 text-xs mb-5 font-medium leading-relaxed relative z-10">
                หากพบปัญหาในการใช้งาน หรือข้อมูลส่วนบุคคลไม่ถูกต้อง กรุณาติดต่อหน่วยงานทะเบียน
              </p>
              <button className="text-xs font-bold text-white underline underline-offset-4 hover:text-emerald-400 transition-colors relative z-10">
                ติดต่อศูนย์ช่วยเหลือ
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Content */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">

            {/* Assessment Priority Box */}
            {assessmentStatus.length > 0 && (
              <div className={`rounded-[2rem] p-6 sm:p-8 shadow-sm border relative overflow-hidden transition-colors ${pendingCount > 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-white border-slate-200'}`}>
                {/* Decorative BG */}
                {pendingCount > 0 && <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>}

                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${pendingCount > 0 ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-black mb-1 ${pendingCount > 0 ? 'text-white' : 'text-slate-800'}`}>แบบประเมินอาจารย์ที่ปรึกษา</h2>
                      <p className={`text-sm font-medium ${pendingCount > 0 ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {pendingCount > 0 ? 'กรุณาดำเนินการประเมินให้เสร็จสิ้น' : 'ส่วนสำคัญสำหรับการประเมินการปฏิบัติงาน'}
                      </p>
                    </div>
                  </div>

                  {pendingCount > 0 ? (
                    <div className="bg-white text-indigo-600 font-black text-xs px-4 py-2.5 rounded-xl shadow-sm animate-pulse whitespace-nowrap">
                      รอดำเนินการ {pendingCount} รายการ
                    </div>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                      <CheckCircle2 size={16} /> ประเมินครบแล้ว
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {assessmentStatus.map((status) => (
                    <div key={`${status.aroundId}-${status.advisorId}`} className={`p-4 sm:p-5 rounded-[1.5rem] border flex flex-col justify-between gap-5 transition-all ${pendingCount > 0 ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}>
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${pendingCount > 0 ? 'text-indigo-200' : 'text-slate-400'}`}>{status.termLabel}</div>
                        <h3 className={`font-bold text-lg line-clamp-1 ${pendingCount > 0 ? 'text-white' : 'text-slate-800'}`} title={status.advisorName}>{status.advisorName}</h3>
                      </div>

                      {status.isCompleted ? (
                        <div className={`flex items-center gap-2 font-bold text-sm ${pendingCount > 0 ? 'text-emerald-300' : 'text-emerald-600'}`}>
                          <CheckCircle2 size={18} /> ประเมินสำเร็จ
                        </div>
                      ) : (
                        <Link href="/dashboard/assessment-advisor" className={`flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${pendingCount > 0 ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                          ดำเนินการประเมิน <ChevronRight size={16} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<School size={20} className="text-blue-500" />}
                title="ระดับคณะ"
                value={student.faculty_name || "ไม่ระบุ"}
                bgClass="bg-blue-50"
              />
              <StatCard
                icon={<Award size={20} className="text-purple-500" />}
                title="สาขาวิชา"
                value={student.major_name || "ไม่ระบุ"}
                bgClass="bg-purple-50"
              />
              <StatCard
                icon={<Clock size={20} className="text-amber-500" />}
                title="ปีที่เข้าศึกษา"
                value={student.created_at ? new Date(student.created_at).getFullYear().toString() : "-"}
                bgClass="bg-amber-50"
              />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Account Details */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                    <FileText size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">ข้อมูลรายละเอียด</h3>
                </div>

                <div className="space-y-4">
                  <InfoRow label="คณะต้นสังกัด" value={student.faculty_name} />
                  <InfoRow label="หลักสูตร/สาขา" value={student.major_name} />
                  <InfoRow label="รหัสประจำตัว" value={student.student_id ? student.student_id : "-"} />
                  {/* แสดงสถานะการยืนยันห้องเรียน */}
                  <InfoRow
                    label="ห้องเรียนประจำ"
                    value={
                      <div className="flex items-center justify-end gap-2">
                        <span className="truncate">{student.room_code || "ไม่ระบุ"}</span>
                        {student.room_code && (
                          student.confirm_status ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100 whitespace-nowrap">
                              <CheckCircle2 size={12} /> ยืนยันแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100 whitespace-nowrap">
                              <Clock size={12} /> รอการยืนยัน
                            </span>
                          )
                        )}
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Advisors List */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <User size={18} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">อาจารย์ที่ปรึกษา</h3>
                  </div>
                  <span className="bg-slate-50 text-slate-500 font-bold px-2.5 py-1 rounded-lg text-xs border border-slate-100">
                    {advisorsList.length} ท่าน
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[220px]">
                  {advisorsList.length > 0 ? (
                    advisorsList.map((adv: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-100 transition-colors group">
                        <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center font-bold text-indigo-500 text-sm overflow-hidden shrink-0">
                          {adv.avatar_url ? (
                            <img src={adv.avatar_url} alt="Advisor" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="font-bold text-slate-800 text-sm truncate" title={adv.fullName}>{adv.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            <Phone size={10} /> {adv.phone !== "-" ? adv.phone : "ไม่มีเบอร์ติดต่อ"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                      <MapPin className="text-slate-300 mb-2" size={24} />
                      <p className="text-sm font-bold text-slate-500 mb-1">ยังไม่มีอาจารย์ที่ปรึกษา</p>
                      <p className="text-xs font-medium text-slate-400">ระบบยังไม่ได้ระบุอาจารย์ในห้องเรียน</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Micro Components
function StatCard({ icon, title, value, bgClass }: { icon: React.ReactNode, title: string, value: string, bgClass: string }) {
  return (
    <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className={`w-fit p-2.5 rounded-xl ${bgClass} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-base font-black text-slate-800 truncate" title={value}>{value}</h4>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-800 sm:text-right truncate">{value || "-"}</span>
    </div>
  );
}