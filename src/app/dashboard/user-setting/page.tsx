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
  Loader2,
  Calendar,
  Phone,
  ShieldCheck,
  Save,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  School,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UserSetting() {
  const [student, setStudent] = useState<any>(null);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStudent = async () => {
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

        // Fetch Faculties, Majors, Rooms
        const [
          { data: facultiesData },
          { data: majorsData },
          { data: roomsData },
        ] = await Promise.all([
          supabase.from("faculties").select("*"),
          supabase.from("majors").select("*"),
          supabase.from("rooms").select("*"),
        ]);

        setFaculties(facultiesData || []);
        setMajors(majorsData || []);
        setRooms(roomsData || []);

        const processedData = {
          id: profileData?.id || userId,
          email: session.user.email || "",
          username: profileData?.username || "-",
          role: profileData?.role || "นักศึกษา",
          created_at: profileData?.created_at,
          first_name: studentData?.first_name || "",
          last_name: studentData?.last_name || "",
          gender: studentData?.gender || "",
          phone: studentData?.phone || "",
          student_id: studentData?.student_id || "-",
          room_id: studentData?.room_id || "",
          room_code: studentData?.rooms?.room_code || "-",
          major_id: studentData?.rooms?.major_id || "",
          major_name: studentData?.rooms?.majors?.major_name || "-",
          faculty_id: studentData?.rooms?.majors?.faculty_id || "",
          faculty_name:
            studentData?.rooms?.majors?.faculties?.faculty_name || "-",
          profile_url: profileData?.avatar_url || null,
        };

        setStudent(processedData);
      } catch (err) {
        console.error("Error in profile fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [router]);

  const handleSave = async () => {
    if (!student) return;

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

      // Upsert student details to the students table
      const studentUpdate = {
        id: session.user.id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        gender: student.gender === "-" ? null : student.gender,
        phone: student.phone,
        room_id: student.room_id ? parseInt(student.room_id, 10) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("students")
        .upsert(studentUpdate)
        .select();

      if (error) throw error;

      setMessage({ text: "บันทึกข้อมูลสำเร็จ", type: "success" });

      // Auto clear message after few seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage({
        text: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="p-10 bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl flex flex-col items-center border border-white max-w-sm w-full animate-fade-up">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-ksu/10 rounded-3xl flex items-center justify-center animate-spin [animation-duration:3s]">
              <Settings size={40} className="text-ksu" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-ksu/20 rounded-3xl animate-pulse blur-xl"></div>
          </div>
          <p className="font-black text-slate-800 text-xl tracking-tight mb-2">กำลังเตรียมข้อมูล</p>
          <p className="text-slate-400 font-medium text-center">โปรดรอสักครู่ ระบบกำลังดึงรายละเอียดส่วนตัวของคุณ...</p>
          <div className="mt-8 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-ksu w-1/3 rounded-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="bg-white/80 backdrop-blur-2xl p-12 rounded-[3.5rem] shadow-2xl border border-white text-center max-w-lg w-full animate-fade-up">
          <div className="w-28 h-28 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShieldCheck className="text-rose-500" size={56} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">ไม่พบข้อมูลผู้ใช้งาน</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg">
            ขออภัย ระบบไม่พบความเชื่อมโยงของบัญชีนี้ในระบบฐานข้อมูล <br />โปรดลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="group relative w-full bg-ksu text-white px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-ksu-dark transition-all shadow-xl shadow-ksu/30 overflow-hidden active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <ArrowLeft size={24} className="group-hover:-translate-x-2 transition-transform" />
              กลับไปหน้าหลัก
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-ksu/30 selection:text-ksu-dark">
      {/* Premium Hero Section */}
      <div className="relative h-auto pb-32 pt-12 md:pb-40 md:pt-20 w-full overflow-hidden bg-gradient-to-br from-ksu to-ksu-dark">
        {/* Dynamic Abstract Shapes */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/10 rounded-full blur-[80px]"></div>

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-ksu-light/10 rounded-full blur-xl animate-float delay-500"></div>

        <div className="max-w-6xl mx-auto px-4 flex flex-col justify-center relative z-10">
          <div className="animate-fade-up">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-bold transition-all bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl group mb-6"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              ย้อนกลับหน้าแดชบอร์ด
            </Link>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-2xl">
                <Settings size={40} className="text-white animate-spin [animation-duration:8s]" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                  การตั้งค่าบัญชี
                </h1>
                <p className="text-white/70 font-medium md:text-lg mt-1">
                  ข้อมูลส่วนตัวและรายละเอียดทางการศึกษา
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Panel: Profile Card */}
          <div className="lg:col-span-4 space-y-6 animate-fade-up delay-100">
            <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ksu via-ksu-dark to-ksu"></div>

              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-48 h-48 bg-slate-100 rounded-full p-1.5 border-4 border-white shadow-2xl overflow-hidden ring-1 ring-slate-100 transition-transform duration-500 group-hover:scale-105">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
                      {student.profile_url ? (
                        <img
                          src={student.profile_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <User size={80} strokeWidth={1} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="absolute bottom-3 right-3 bg-ksu text-white p-3.5 rounded-2xl shadow-2xl hover:bg-ksu-dark transition-all hover:scale-110 border-4 border-white active:scale-95 group/btn">
                    <ImageIcon size={20} className="group-hover/btn:rotate-12 transition-transform" />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-slate-800 text-center tracking-tight leading-tight">
                  {student.first_name
                    ? `${student.first_name} ${student.last_name}`
                    : student.username}
                </h2>

                <div className="mt-4 flex flex-col items-center gap-2">
                  <span className="px-5 py-1.5 bg-ksu/10 text-ksu text-sm font-black rounded-full border border-ksu/20 uppercase tracking-widest shadow-sm">
                    {student.role}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm">
                    <Mail size={14} />
                    {student.email || "ไม่ระบุอีเมล"}
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100 my-8"></div>

                <div className="w-full space-y-5">
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะบัญชี</p>
                        <p className="text-sm font-black text-slate-700">ยืนยันแล้ว</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">เป็นสมาชิกตั้งแต่</p>
                        <p className="text-sm font-black text-slate-700">
                          {student.created_at
                            ? new Date(student.created_at).toLocaleDateString(
                              "th-TH",
                              { year: "numeric", month: "long" }
                            )
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex gap-4 text-amber-900 text-sm shadow-sm">
              <AlertCircle size={24} className="shrink-0 text-amber-500" />
              <div>
                <strong className="block mb-1 font-black uppercase text-[10px] tracking-widest">คำแนะนำในการปกป้องข้อมูล</strong>
                <p className="font-medium text-amber-800/80 leading-relaxed">
                  ข้อมูลที่ยังไม่ระบุหรือต้องการแก้ไขให้ถูกต้อง ท่านสามารถจัดการได้ทันที หากพบข้อผิดพลาดในส่วนที่แก้ไขไม่ได้ โปรดติดต่อฝ่ายวิชาการ
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Settings Form */}
          <div className="lg:col-span-8 space-y-6 animate-fade-up delay-200 transition-all duration-500">
            <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white overflow-hidden">

              <div className="p-10">
                <div className="space-y-12">
                  {/* Academic Section */}
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-ksu/10 text-ksu rounded-2xl flex items-center justify-center">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">ข้อมูลสถานะการศึกษา</h3>
                        <p className="text-sm text-slate-400 font-medium">รายละเอียดคณะ สาขา และห้องเรียนปัจจุบันของท่าน</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50/30 rounded-[2rem] border border-slate-100 shadow-inner">
                      <FormSelect
                        label="คณะ (Faculty/College)"
                        defaultValue={student.faculty_id || student.faculty_name}
                        onChange={(e) =>
                          setStudent({ ...student, faculty_id: e.target.value })
                        }
                        options={faculties.map((f) => ({
                          value: f.id,
                          label: f.faculty_name,
                        }))}
                        icon={<School size={20} />}
                        className="md:col-span-2"
                      />
                      <FormSelect
                        label="สาขาวิชา (Program/Major)"
                        defaultValue={student.major_id || student.major_name}
                        onChange={(e) =>
                          setStudent({ ...student, major_id: e.target.value })
                        }
                        options={majors
                          .filter(
                            (m) =>
                              !student.faculty_id ||
                              m.faculty_id.toString() ===
                              student.faculty_id.toString()
                          )
                          .map((m) => ({ value: m.id, label: m.major_name }))}
                        icon={<BookOpen size={20} />}
                        className="md:col-span-2"
                      />
                      <div className="flex flex-col gap-2">
                        <FormSelect
                          label="ห้องเรียน (Room Code)"
                          defaultValue={student.room_id || student.room_code}
                          onChange={(e) =>
                            setStudent({ ...student, room_id: e.target.value })
                          }
                          options={rooms
                            .filter(
                              (r) =>
                                !student.major_id ||
                                r.major_id.toString() ===
                                student.major_id.toString()
                            )
                            .map((r) => ({ value: r.id, label: r.room_code }))}
                          icon={<MapPin size={20} />}
                        />
                        {(!student.room_id || student.room_id === "") && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-xl text-[10px] font-black text-rose-600 border border-rose-100 animate-fade-up">
                            <AlertCircle size={14} /> ถ้าไม่พบห้องเรียน โปรดติดต่ออาจารย์ที่ปรึกษา
                          </div>
                        )}
                      </div>
                      <FormInput
                        label="รหัสนักศึกษา (Student ID)"
                        defaultValue={student.student_id === "-" ? "" : student.student_id}
                        onChange={(e) =>
                          setStudent({ ...student, student_id: e.target.value })
                        }
                        placeholder="กรอกรหัสนักศึกษา"
                        icon={<IdCard size={20} />}
                      />
                    </div>
                  </section>

                  {/* Personal Section */}
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">รายละเอียดส่วนบุคคล</h3>
                        <p className="text-sm text-slate-400 font-medium">อัปเดตข้อมูลส่วนตัวเพื่อให้ข้อมูลมีความเป็นปัจจุบันที่สุด</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50/30 rounded-[2rem] border border-slate-100 shadow-inner">
                      <FormSelect
                        label="เพศ (Gender)"
                        defaultValue={student.gender}
                        onChange={(e) =>
                          setStudent({ ...student, gender: e.target.value })
                        }
                        options={[
                          { value: "ชาย", label: "ชาย (Male)" },
                          { value: "หญิง", label: "หญิง (Female)" },
                          { value: "อื่นๆ", label: "อื่นๆ (Other)" },
                        ]}
                        icon={<User size={20} />}
                      />
                      <FormInput
                        label="เบอร์โทรศัพท์ติดต่อ (Phone Number)"
                        defaultValue={student.phone}
                        onChange={(e) =>
                          setStudent({ ...student, phone: e.target.value })
                        }
                        placeholder="08X-XXX-XXXX"
                        icon={<Phone size={20} />}
                      />
                      <FormInput
                        label="ชื่อจริง (First Name)"
                        defaultValue={student.first_name}
                        onChange={(e) =>
                          setStudent({ ...student, first_name: e.target.value })
                        }
                      />
                      <FormInput
                        label="นามสกุล (Last Name)"
                        defaultValue={student.last_name}
                        onChange={(e) =>
                          setStudent({ ...student, last_name: e.target.value })
                        }
                      />
                    </div>
                  </section>

                  {/* Save Actions */}
                  <div className="pt-10 flex flex-col md:flex-row items-center justify-end gap-4 border-t border-slate-100">
                    {message && (
                      <div
                        className={`mr-auto px-6 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm animate-fade-up ${message.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                      >
                        {message.type === "success" ? (
                          <ShieldCheck size={20} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={20} className="text-rose-500" />
                        )}
                        <p>{message.text}</p>
                      </div>
                    )}

                    <div className="flex gap-4 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="flex-1 md:flex-none px-10 py-4 text-sm font-black text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest active:scale-95"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 md:flex-none px-12 py-4 text-sm font-black text-white bg-ksu rounded-2xl hover:bg-ksu-dark transition-all shadow-xl shadow-ksu/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest active:scale-95 group"
                      >
                        {saving ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Save size={20} className="group-hover:scale-110 transition-transform" />
                        )}
                        {saving ? "กำลังดำเนินการ..." : "บันทึกข้อมูล"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents
interface FormInputProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
  className?: string;
  isTextArea?: boolean;
}

function FormInput({
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  type = "text",
  readOnly,
  icon,
  className,
  isTextArea,
}: FormInputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group/field">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-ksu transition-colors duration-300">
            {icon}
          </div>
        )}
        {isTextArea ? (
          <textarea
            defaultValue={defaultValue}
            value={readOnly ? value : undefined}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={3}
            className={`w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ksu/20 focus:border-ksu ${icon ? "pl-11" : ""} ${readOnly ? "bg-slate-50 text-slate-500 border-slate-100 cursor-not-allowed" : "bg-white text-slate-900 hover:border-slate-300 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]"}`}
          />
        ) : (
          <input
            type={type}
            defaultValue={defaultValue}
            value={readOnly ? value : undefined}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ksu/20 focus:border-ksu ${icon ? "pl-11" : ""} ${readOnly ? "bg-slate-50 text-slate-500 border-slate-100 cursor-not-allowed font-semibold" : "bg-white text-slate-900 hover:border-slate-300 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]"}`}
          />
        )}
      </div>
    </div>
  );
}

// Added FormSelect
interface FormSelectProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  className?: string;
}

function FormSelect({
  label,
  value,
  defaultValue,
  onChange,
  options,
  icon,
  className,
}: FormSelectProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group/field">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-ksu transition-colors duration-300">
            {icon}
          </div>
        )}
        <select
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ksu/20 focus:border-ksu ${icon ? "pl-11" : ""} bg-white text-slate-900 hover:border-slate-300 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] appearance-none cursor-pointer`}
        >
          <option value="" disabled>
            เลือกระบุ
          </option>
          <option value="-">ยังไม่ระบุ</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/field:text-slate-600 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
