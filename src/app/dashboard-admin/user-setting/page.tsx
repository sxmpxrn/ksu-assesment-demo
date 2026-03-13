"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Users,
  Building2,
  Settings
} from "lucide-react";
import UserSettingTab from "./component/UserSettingTab";
import GeneralSettingTab from "./component/GeneralSettingTab";

// --- Types ---
type Tab = "user" | "general";

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

export default function UserSetting() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("user");

  // --- Master Data State ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Fetch Master Data (Faculties, Majors, Rooms) for Dropdowns
  useEffect(() => {
    fetchMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMasterData = async () => {
    setMasterLoading(true);
    try {
      const [facRes, majRes, roomRes] = await Promise.all([
        supabase.from("faculties").select("*").order("id"),
        supabase.from("majors").select("*, faculties(faculty_name)").order("id"),
        supabase.from("rooms").select("*, majors(major_name, faculty_id)").order("id"),
      ]);

      if (facRes.data) setFaculties(facRes.data);
      if (majRes.data) setMajors(majRes.data);
      if (roomRes.data) setRooms(roomRes.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
    } finally {
      setMasterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-800 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Main Tabs */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <Settings className="text-ksu" size={32} />
            ตั้งค่าระบบ (System Settings)
          </h1>
          <p className="text-gray-500 mt-2 text-base">
            จัดการข้อมูลผู้ใช้งานและโครงสร้างองค์กร (คณะ, สาขา, ห้องเรียน)
          </p>
        </div>

        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("user")}
            className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 flex items-center gap-2 ${activeTab === "user" ? "border-ksu text-ksu" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            <Users size={20} />
            จัดการผู้ใช้งาน
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 flex items-center gap-2 ${activeTab === "general" ? "border-ksu text-ksu" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            <Building2 size={20} />
            จัดการข้อมูลทั่วไป
          </button>
        </div>

        {/* ----------------- TAB: USER SETTING ----------------- */}
        {activeTab === "user" && (
          <UserSettingTab
            supabase={supabase}
            faculties={faculties}
            majors={majors}
            rooms={rooms}
          />
        )}

        {/* ----------------- TAB: GENERAL SETTING ----------------- */}
        {activeTab === "general" && (
          <GeneralSettingTab
            supabase={supabase}
            faculties={faculties}
            majors={majors}
            rooms={rooms}
            fetchMasterData={fetchMasterData}
            masterLoading={masterLoading}
          />
        )}
      </div>
    </div>
  );
}
