"use client";
import { useState, useMemo } from "react";
import {
  GraduationCap,
  School,
  Search,
  Loader2,
  AlertCircle,
  Users,
  CheckCircle2
} from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";

interface Faculty {
  id: number;
  faculty_name: string;
}

interface Major {
  id: number;
  major_name: string;
  faculty_id: number;
  faculties?: Faculty;
}

interface Room {
  id: number;
  room_code: string;
  room_name: string;
  building: string;
  major_id: number;
  majors?: Major;
}

interface UserSettingTabProps {
  supabase: SupabaseClient;
  faculties: Faculty[];
  majors: Major[];
  rooms: Room[];
}

type UserRole = "student" | "advisor";

export default function UserSettingTab({ supabase, faculties, majors, rooms }: UserSettingTabProps) {
  const [userRole, setUserRole] = useState<UserRole>("student");
  // Filters
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [usersList, setUsersList] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasTooManyResults, setHasTooManyResults] = useState(false);

  // --- Filter Logic ---
  const filteredMajors = useMemo(() => {
    if (!selectedFaculty) return majors;
    return majors.filter((m) => String(m.faculty_id) === selectedFaculty);
  }, [majors, selectedFaculty]);

  const filteredRooms = useMemo(() => {
    if (!selectedMajor) return rooms;
    return rooms.filter((r) => String(r.major_id) === selectedMajor);
  }, [rooms, selectedMajor]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFaculty) count++;
    if (selectedMajor) count++;
    if (selectedRoom) count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [selectedFaculty, selectedMajor, selectedRoom, searchQuery]);

  const canSearch = activeFiltersCount >= 1;

  // --- Search Users (Students or Advisors) ---
  const handleSearchUsers = async () => {
    if (!canSearch) return;
    setIsSearching(true);
    setHasSearched(true);
    setUsersList([]);
    setHasTooManyResults(false);

    try {
      if (userRole === "student") {
        // Build Student Search Query
        let query = supabase.from("students").select(`
          *,
          rooms:room_id (
            room_code, majors ( major_name, faculties ( faculty_name ) )
          )
        `);

        // Apply filters
        if (selectedRoom) {
          query = query.eq("room_id", selectedRoom);
        } else if (selectedMajor) {
          const validRooms = rooms.filter(r => String(r.major_id) === selectedMajor).map(r => r.id);
          if (validRooms.length > 0) query = query.in("room_id", validRooms);
          else query = query.eq("room_id", -1);
        } else if (selectedFaculty) {
          const validMajors = majors.filter(m => String(m.faculty_id) === selectedFaculty).map(m => m.id);
          const validRooms = rooms.filter(r => validMajors.includes(r.major_id)).map(r => r.id);
          if (validRooms.length > 0) query = query.in("room_id", validRooms);
          else query = query.eq("room_id", -1);
        }

        if (searchQuery.trim()) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const results = data || [];
        if (results.length > 20) {
          setHasTooManyResults(true);
          setUsersList(results.slice(0, 20));
        } else {
          setUsersList(results);
        }

      } else {
        // Advisor Search Query
        let query = supabase.from("teacher_relationship").select(`
          id,
          teachers (
            *,
            profiles (
              username
            )
          ),
          rooms (
            id, room_code, majors ( faculty_id )
          )
        `);

        if (selectedRoom) {
          query = query.eq("room_id", selectedRoom);
        } else if (selectedMajor) {
          const validRooms = rooms.filter(r => String(r.major_id) === selectedMajor).map(r => r.id);
          if (validRooms.length > 0) query = query.in("room_id", validRooms);
        }

        const { data, error } = await query;
        if (error) throw error;

        let matchedAdvisors = new Map();
        data?.forEach((rel: any) => {
          if (!rel.teachers) return;
          const t = Array.isArray(rel.teachers) ? rel.teachers[0] : rel.teachers;
          const r = Array.isArray(rel.rooms) ? rel.rooms[0] : rel.rooms;
          if (!t) return;

          t.rooms_managed = t.rooms_managed || [];
          if (r && !t.rooms_managed.includes(r.room_code)) {
            t.rooms_managed.push(r.room_code);
          }

          const getProfile = (t: any) => Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
          const p = getProfile(t);

          const fullName = `${t.title_name || ""}${t.first_name || ""} ${t.last_name || ""}`.trim();
          t.fullname = fullName !== "" ? fullName : (p?.username || "");
          t.username = p?.username || "";

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (t.username.toLowerCase().includes(q) || t.fullname.toLowerCase().includes(q)) {
              matchedAdvisors.set(t.id, t);
            }
          } else {
            matchedAdvisors.set(t.id, t);
          }
        });

        let finalAdvisors = [];

        if (selectedFaculty && !selectedRoom && !selectedMajor) {
          const facIdStr = String(selectedFaculty);
          finalAdvisors = Array.from(matchedAdvisors.values()).filter(t => {
            return data.some((r: any) => {
              const relT = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers;
              const relR = Array.isArray(r.rooms) ? r.rooms[0] : r.rooms;
              return relT?.id === t.id && String(relR?.majors?.faculty_id) === facIdStr;
            });
          });
        } else {
          finalAdvisors = Array.from(matchedAdvisors.values());
        }

        if (finalAdvisors.length > 20) {
          setHasTooManyResults(true);
          setUsersList(finalAdvisors.slice(0, 20));
        } else {
          setUsersList(finalAdvisors);
        }
      }
    } catch (err: any) {
      console.error("Search error:", err);
      alert("Error Searching: " + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Role Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-xl">
          <button
            onClick={() => { setUserRole("student"); setHasSearched(false); setUsersList([]); setHasTooManyResults(false); }}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${userRole === "student" ? "bg-white text-ksu shadow-sm ring-1 ring-gray-200/50" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
          >
            <GraduationCap size={18} />
            นักศึกษา (Students)
          </button>
          <button
            onClick={() => { setUserRole("advisor"); setHasSearched(false); setUsersList([]); setHasTooManyResults(false); }}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${userRole === "advisor" ? "bg-white text-ksu shadow-sm ring-1 ring-gray-200/50" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
          >
            <School size={18} />
            อาจารย์ที่ปรึกษา (Advisors)
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
          <Users size={16} />
          <span>ระบบจัดการข้อมูลบุคคล</span>
        </div>
      </div>

      {/* 2. Filter Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-ksu opacity-80"></div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Search size={24} className="text-ksu" />
              ค้นหาข้อมูล{userRole === "student" ? "นักศึกษา" : "อาจารย์ที่ปรึกษา"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              กรุณาระบุเงื่อนไขอย่างน้อย 1 อย่างเพื่อดึงข้อมูลจากระบบ
            </p>
          </div>
          <div className="text-sm">
            {!canSearch ? (
              <span className="text-amber-600 bg-amber-50 px-4 py-2 rounded-xl flex items-center gap-2 font-medium border border-amber-200/50">
                <AlertCircle size={16} />
                ระบุตัวกรองอีก {1 - activeFiltersCount} อย่าง
              </span>
            ) : (
              <span className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-emerald-200/50">
                <CheckCircle2 size={16} />
                พร้อมค้นหา ({activeFiltersCount} ตัวกรอง)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">คณะ (Faculty)</label>
            <select
              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-ksu/20 focus:border-ksu block p-3 outline-none transition-all shadow-sm"
              value={selectedFaculty} onChange={(e) => { setSelectedFaculty(e.target.value); setSelectedMajor(""); setSelectedRoom(""); }}
            >
              <option value="">-- ทั้งหมด --</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">สาขา (Major)</label>
            <select
              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-ksu/20 focus:border-ksu block p-3 outline-none transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
              value={selectedMajor} onChange={(e) => { setSelectedMajor(e.target.value); setSelectedRoom(""); }}
              disabled={!selectedFaculty && filteredMajors.length === majors.length}
            >
              <option value="">-- ทั้งหมด --</option>
              {filteredMajors.map(m => <option key={m.id} value={m.id}>{m.major_name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">ห้องเรียน (Room)</label>
            <select
              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-ksu/20 focus:border-ksu block p-3 outline-none transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
              value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}
              disabled={!selectedMajor && filteredRooms.length === rooms.length}
            >
              <option value="">-- ทั้งหมด --</option>
              {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.room_code} {r.room_name ? `(${r.room_name})` : ""}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">รหัส / ชื่อผู้ใช้</label>
            <input
              type="text"
              placeholder="รหัส หรือ ชื่อ..."
              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-ksu/20 focus:border-ksu block p-3 outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={() => { setSelectedFaculty(""); setSelectedMajor(""); setSelectedRoom(""); setSearchQuery(""); setHasSearched(false); setUsersList([]); setHasTooManyResults(false); }}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            ค่าตั้งต้น
          </button>
          <button
            onClick={handleSearchUsers}
            disabled={!canSearch || isSearching}
            className="px-8 py-2.5 text-sm font-bold text-white bg-ksu rounded-xl hover:bg-ksu-dark disabled:opacity-50 disabled:hover:bg-ksu transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-w-[140px]"
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            ค้นหาข้อมูล
          </button>
        </div>
      </div>

      {/* 3. Results Section */}
      {hasSearched && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-gray-50/80 to-white flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-ksu" />
              ผลการค้นหา {userRole === "student" ? "นักศึกษา" : "อาจารย์"}
            </h3>
            <div className="flex items-center gap-3">
              {hasTooManyResults && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <AlertCircle size={14} /> ผลลัพธ์มากเกินไป (แสดงแค่ 20 รายการแรก)
                </span>
              )}
              <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                TOTAL: {usersList.length} {hasTooManyResults && "+"}
              </div>
            </div>
          </div>

          <div className="p-0">
            {isSearching ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-ksu/10 rounded-full">
                  <Loader2 size={32} className="text-ksu animate-spin" />
                </div>
                <p className="text-gray-500 font-medium animate-pulse">กำลังประมวลผลข้อมูลจากระบบ...</p>
              </div>
            ) : usersList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4 whitespace-nowrap w-[20%]">
                        {userRole === "student" ? "รหัสนักศึกษา" : "อีเมล / Username"}
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap w-[30%]">ชื่อ-นามสกุล</th>
                      <th className="px-6 py-4 whitespace-nowrap w-[25%]">
                        {userRole === "student" ? "ห้องเรียน" : "ห้องเรียนที่ดูแล (รหัส)"}
                      </th>
                      {userRole === "student" && (
                        <th className="px-6 py-4 whitespace-nowrap w-[25%]">สังกัด / คณะ</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((u, idx) => (
                      <tr key={u.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold border border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                              {userRole === "student" ? <GraduationCap size={14} /> : <School size={14} />}
                            </div>
                            <span className="font-mono font-bold text-gray-700">
                              {userRole === "student" ? u.student_id : u.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {userRole === "student" ? (
                            u.first_name ? `${u.first_name} ${u.last_name || ""}`.trim() : <span className="text-gray-400 italic">ไม่ระบุ</span>
                          ) : (
                            u.fullname || <span className="text-gray-400 italic">ไม่ระบุ</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {userRole === "student" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-ksu/10 text-ksu border border-ksu/20">
                              {u.rooms?.room_code || "ไม่ระบุข้อมูล"}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {u.rooms_managed && u.rooms_managed.length > 0 ? (
                                u.rooms_managed.map((rc: string, i: number) => (
                                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {rc}
                                  </span>
                                ))
                              ) : <span className="text-gray-400 italic text-sm">ไม่มีข้อมูลห้องรับผิดชอบ</span>}
                            </div>
                          )}
                        </td>
                        {userRole === "student" && (
                          <td className="px-6 py-4 text-sm text-gray-500 line-clamp-2">
                            {u.rooms?.majors?.faculties?.faculty_name || u.std_faculty || <span className="text-gray-400 italic">ไม่ระบุ</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center text-gray-300 mb-5 border-2 border-dashed border-gray-200">
                  <Search size={36} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</h3>
                <p className="text-gray-500 max-w-sm">
                  ไม่มีผู้ใช้ในระบบที่ตรงกับตัวกรองที่คุณกำหนดอยู่ตอนนี้ ลองปรับเงื่อนไขให้กว้างขึ้นเพื่อค้นหา
                </p>
                <button
                  onClick={() => { setSelectedFaculty(""); setSelectedMajor(""); setSelectedRoom(""); setSearchQuery(""); setHasTooManyResults(false); }}
                  className="mt-6 px-6 py-2 text-sm font-bold text-ksu bg-ksu/10 hover:bg-ksu/20 rounded-xl transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
