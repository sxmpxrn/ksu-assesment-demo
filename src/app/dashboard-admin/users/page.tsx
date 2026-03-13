"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { deleteUserFromAuth } from "@/app/actions/admin"; // นำเข้า Server Action ที่เราเพิ่งสร้าง
import {
  User,
  Check,
  Trash2,
  Clock,
  ShieldAlert,
  Loader2,
  Users,
  Search,
  CheckCircle2,
} from "lucide-react";

type Profile = {
  id: string;
  username: string;
  role: string;
  created_at: string;
  confirm: boolean | null;
};

export default function PendingApprovals() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = createClient();

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or("confirm.eq.false,confirm.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setUsers(data);
    } catch (error) {
      console.error("Error fetching pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // ฟังก์ชันอนุมัติผู้ใช้งาน (อัปเดต profile.confirm = true)
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ confirm: true })
        .eq("id", id);

      if (error) throw error;

      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error) {
      console.error("Error approving user:", error);
      alert("เกิดข้อผิดพลาดในการอนุมัติผู้ใช้งาน");
    } finally {
      setActionLoading(null);
    }
  };

  // ฟังก์ชันปฏิเสธผู้ใช้งาน (ลบออกจากระบบ auth โดยสมบูรณ์)
  const handleReject = async (id: string) => {
    if (!window.confirm("คุณแน่ใจหรือไม่? การกระทำนี้จะลบผู้ใช้งานออกจากระบบอย่างถาวร")) {
      return;
    }

    setActionLoading(id);
    try {
      // เรียกใช้ Server Action เพื่อลบจาก auth.users
      const result = await deleteUserFromAuth(id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // เมื่อลบจาก auth สำเร็จ ข้อมูลใน profile จะถูกลบไปด้วย (ON DELETE CASCADE)
      // เราแค่อัปเดตหน้าจอให้ Row นั้นหายไป
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      alert(`เกิดข้อผิดพลาดในการลบผู้ใช้งาน: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "student":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "advisor":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "admin":
        return "bg-red-50 text-red-600 border-red-200";
      case "executives":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <ShieldAlert size={28} />
              </div>
              รอการยืนยันเข้าสู่ระบบ
            </h1>
            <p className="text-slate-500 font-medium mt-2 ml-14">
              ตรวจสอบและอนุมัติบัญชีผู้ใช้งานที่เพิ่งลงทะเบียนใหม่
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full md:w-48 placeholder:text-slate-400 text-slate-700"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800">รายชื่อผู้ใช้งานรออนุมัติ</h2>
            </div>
            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1 rounded-full">
              รออนุมัติ {users.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500">
              <Loader2 size={40} className="animate-spin mb-4 text-indigo-500" />
              <p className="font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่มีรายการค้างอนุมัติ</h3>
              <p className="text-slate-500">ผู้ใช้งานทั้งหมดได้รับการตรวจสอบและยืนยันเรียบร้อยแล้ว</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ผู้ใช้งาน (Username)</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">บทบาท (Role)</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">วันที่สมัคร</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{user.username}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-[120px] truncate" title={user.id}>
                              ID: {user.id.split('-')[0]}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <Clock size={14} className="text-slate-400" />
                          {formatDate(user.created_at)}
                        </div>
                      </td>

                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="อนุมัติผู้ใช้งาน"
                          >
                            {actionLoading === user.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                          </button>
                          
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="ลบ/ปฏิเสธ"
                          >
                            {actionLoading === user.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}