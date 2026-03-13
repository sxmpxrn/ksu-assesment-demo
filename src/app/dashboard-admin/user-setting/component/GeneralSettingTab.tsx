"use client";
import { useState, useEffect, Fragment } from "react";
import {
  Trash2,
  Edit2,
  Save,
  Plus,
  Building2,
  BookOpen,
  Monitor,
  Loader2
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

interface GeneralSettingTabProps {
  supabase: SupabaseClient;
  faculties: Faculty[];
  majors: Major[];
  rooms: Room[];
  fetchMasterData: () => Promise<void>;
  masterLoading: boolean;
}

type GeneralTab = "faculties" | "majors" | "rooms";

export default function GeneralSettingTab({
  supabase,
  faculties,
  majors,
  rooms,
  fetchMasterData,
  masterLoading
}: GeneralSettingTabProps) {
  const [generalActiveTab, setGeneralActiveTab] = useState<GeneralTab>("faculties");
  const [generalItems, setGeneralItems] = useState<any[]>([]);
  const [generalLoading, setGeneralLoading] = useState(false);

  // Modals/Forms State
  const [isAddingGeneral, setIsAddingGeneral] = useState(false);
  const [editingGeneralId, setEditingGeneralId] = useState<number | null>(null);
  const [generalFormData, setGeneralFormData] = useState<any>({});

  const fetchGeneralItems = () => {
    setGeneralLoading(true);
    if (generalActiveTab === "faculties") {
      setGeneralItems(faculties);
    } else if (generalActiveTab === "majors") {
      setGeneralItems(majors);
    } else if (generalActiveTab === "rooms") {
      setGeneralItems(rooms);
    }
    setGeneralLoading(false);
  };

  useEffect(() => {
    fetchGeneralItems();
    setIsAddingGeneral(false);
    setEditingGeneralId(null);
    setGeneralFormData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalActiveTab, faculties, majors, rooms]);

  const handleGeneralSave = async () => {
    setGeneralLoading(true);
    try {
      let table = generalActiveTab;

      const submitData = { ...generalFormData };
      delete submitData.faculties;
      delete submitData.majors;
      delete submitData._faculty_id;

      if (isAddingGeneral) {
        const { error } = await supabase.from(table).insert([submitData]);
        if (error) throw error;
      } else if (editingGeneralId) {
        const { error } = await supabase.from(table).update(submitData).eq("id", editingGeneralId);
        if (error) throw error;
      }

      await fetchMasterData();
      setIsAddingGeneral(false);
      setEditingGeneralId(null);
    } catch (err: any) {
      console.error("Save error:", err);
      alert("บันทึกข้อมูลไม่สำเร็จ: " + (err.message || "Table may not exist yet"));
    } finally {
      setGeneralLoading(false);
    }
  };

  const handleGeneralDelete = async (id: number) => {
    if (!confirm("ยืนยันการลบข้อมูล? (ข้อมูลที่เกี่ยวข้องอาจได้รับผลกระทบ)")) return;
    setGeneralLoading(true);
    try {
      const { error } = await supabase.from(generalActiveTab).delete().eq("id", id);
      if (error) throw error;
      await fetchMasterData();
    } catch (err: any) {
      alert("ลบข้อมูลไม่สำเร็จ: " + err.message);
    } finally {
      setGeneralLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-300">
      {/* General Settings Sidebar */}
      <div className="w-full lg:w-72 shrink-0 space-y-3">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
          <h3 className="uppercase tracking-widest text-xs font-black text-gray-500">Data Management</h3>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { id: "faculties", label: "ข้อมูลคณะ (Faculties)", icon: Building2 },
            { id: "majors", label: "ข้อมูลสาขาวิชา (Majors)", icon: BookOpen },
            { id: "rooms", label: "ข้อมูลห้องเรียน (Rooms)", icon: Monitor },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = generalActiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setGeneralActiveTab(item.id as GeneralTab)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all duration-200 border ${isActive
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm transform scale-[1.02]"
                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 hover:shadow"
                  }`}
              >
                <div className={`p-2 rounded-xl flex items-center justify-center ${isActive ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                  <Icon size={20} />
                </div>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* General Settings Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 capitalize flex items-center gap-2">
              {generalActiveTab === "faculties" && <><Building2 className="text-indigo-500" /> คณะ (Faculties)</>}
              {generalActiveTab === "majors" && <><BookOpen className="text-indigo-500" /> สาขาวิชา (Majors)</>}
              {generalActiveTab === "rooms" && <><Monitor className="text-indigo-500" /> ห้องเรียน (Rooms)</>}
            </h2>
            <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลพื้นฐานเพื่อใช้ในระบบ</p>
          </div>
          <button
            onClick={() => { setIsAddingGeneral(true); setEditingGeneralId(null); setGeneralFormData({}); }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus size={18} strokeWidth={2.5} />
            เพิ่มข้อมูลใหม่
          </button>
        </div>

        <div className="p-8 flex-1 relative bg-white">
          {generalLoading || masterLoading ? (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <p className="font-bold text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          ) : null}

          {/* Add / Edit Form Inline */}
          {(isAddingGeneral || editingGeneralId) && (
            <div className="mb-8 p-6 lg:p-8 bg-indigo-50/50 border-2 border-indigo-100 rounded-3xl shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Edit2 size={100} />
              </div>
              <h3 className="text-indigo-900 font-black text-lg mb-6 flex items-center gap-2 relative z-10">
                <div className="bg-indigo-200 p-2 rounded-full text-indigo-700">
                  <Edit2 size={18} />
                </div>
                {isAddingGeneral ? "เพิ่มข้อมูลใหม่ลงในระบบ" : "แก้ไขข้อมูลในระบบ"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {generalActiveTab === "faculties" && (
                  <div className="col-span-1 md:col-span-2 max-w-xl">
                    <label className="block text-sm font-bold text-indigo-900 mb-2">ชื่อคณะ <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium"
                      placeholder="เช่น คณะวิทยาศาสตร์และเทคโนโลยี"
                      value={generalFormData.faculty_name || ""}
                      onChange={e => setGeneralFormData({ ...generalFormData, faculty_name: e.target.value })} />
                  </div>
                )}

                {generalActiveTab === "majors" && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">ชื่อสาขา <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium"
                        placeholder="เช่น วิทยาการคอมพิวเตอร์"
                        value={generalFormData.major_name || ""}
                        onChange={e => setGeneralFormData({ ...generalFormData, major_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">สังกัดคณะ <span className="text-red-500">*</span></label>
                      <select className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium text-gray-700"
                        value={generalFormData.faculty_id || ""}
                        onChange={e => setGeneralFormData({ ...generalFormData, faculty_id: Number(e.target.value) })}
                      >
                        <option value="" disabled>-- กรุณาเลือกคณะ --</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {generalActiveTab === "rooms" && (
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-indigo-900 mb-2">รหัสห้อง (Room Code) <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium text-indigo-700 font-mono"
                        placeholder="เช่น CS-101 หรือ 1/1"
                        value={generalFormData.room_code || ""}
                        onChange={e => setGeneralFormData({ ...generalFormData, room_code: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">สังกัดคณะ <span className="text-red-500">*</span></label>
                      <select className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium text-gray-700"
                        value={generalFormData._faculty_id || ""}
                        onChange={e => setGeneralFormData({ ...generalFormData, _faculty_id: Number(e.target.value), major_id: "" })}
                      >
                        <option value="" disabled>-- กรุณาเลือกคณะ --</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">สังกัดสาขา <span className="text-red-500">*</span></label>
                      <select className="w-full p-3.5 rounded-xl border border-indigo-200 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-medium text-gray-700"
                        value={generalFormData.major_id || ""}
                        onChange={e => setGeneralFormData({ ...generalFormData, major_id: Number(e.target.value) })}
                        disabled={!generalFormData._faculty_id}
                      >
                        <option value="" disabled>-- กรุณาเลือกสาขา --</option>
                        {majors
                          .filter(m => m.faculty_id === generalFormData._faculty_id)
                          .map(m => <option key={m.id} value={m.id}>{m.major_name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-indigo-200/50 flex flex-col sm:flex-row justify-end gap-3 relative z-10">
                <button onClick={() => { setIsAddingGeneral(false); setEditingGeneralId(null); }} className="px-6 py-3 font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors shadow-sm w-full sm:w-auto">
                  ยกเลิกการแก้ไข
                </button>
                <button onClick={handleGeneralSave} className="px-8 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto">
                  <Save size={18} strokeWidth={2.5} />
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          )}

          {/* Data List Table */}
          {generalItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <Building2 size={64} className="text-gray-300" strokeWidth={1} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">ยังไม่มีข้อมูลในระบบ</h3>
              <p className="text-gray-500 mt-2 text-center max-w-sm">คลิกปุ่ม <span className="font-bold text-indigo-600">"เพิ่มข้อมูลใหม่"</span> ด้านบนเพื่อเริ่มต้นสร้างข้อมูลของคุณ</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {generalActiveTab === "faculties" && (
                        <>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">ID</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest w-full">ชื่อคณะ</th>
                        </>
                      )}
                      {generalActiveTab === "majors" && (
                        <>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">ID</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest w-full">ชื่อสาขา</th>
                        </>
                      )}
                      {generalActiveTab === "rooms" && (
                        <>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">รหัสห้อง</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest w-full">สังกัดคณะ / สาขา</th>
                        </>
                      )}
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-sm">
                    {generalActiveTab === "majors" ? (
                      (() => {
                        const grouped = generalItems.reduce((acc, cur) => {
                          const fName = cur.faculties?.faculty_name || "ไม่ระบุสังกัดคณะ";
                          if (!acc[fName]) acc[fName] = [];
                          acc[fName].push(cur);
                          return acc;
                        }, {} as Record<string, any[]>);

                        return (Object.entries(grouped) as [string, any[]][]).map(([fName, mList]) => (
                          <Fragment key={fName}>
                            <tr className="bg-indigo-50/50 border-y border-indigo-100">
                              <td colSpan={3} className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm text-indigo-600">
                                    <Building2 size={16} strokeWidth={2.5} />
                                  </div>
                                  <span className="font-bold text-indigo-900 text-sm">{fName}</span>
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{mList.length} สาขา</span>
                                </div>
                              </td>
                            </tr>
                            {mList.map((item) => (
                              <tr key={item.id} className="hover:bg-indigo-50/10 transition-colors group">
                                <td className="px-6 py-4 font-mono text-gray-400 font-medium select-all border-l-4 border-transparent group-hover:border-indigo-300">
                                  {item.id}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800 text-base">
                                  <span className="text-indigo-400 mr-2 opacity-50 font-black">-</span> {item.major_name}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => { setEditingGeneralId(item.id); setGeneralFormData({ ...item }); setIsAddingGeneral(false); }}
                                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors tooltip-trigger"
                                      title="แก้ไขข้อมูล"
                                    >
                                      <Edit2 size={18} strokeWidth={2} />
                                    </button>
                                    <button
                                      onClick={() => handleGeneralDelete(item.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors tooltip-trigger"
                                      title="ลบข้อมูล"
                                    >
                                      <Trash2 size={18} strokeWidth={2} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ));
                      })()
                    ) : (
                      generalItems.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                          {generalActiveTab === "faculties" && (
                            <>
                              <td className="px-6 py-4 font-mono text-gray-400 font-medium select-all">{item.id}</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-base">{item.faculty_name}</td>
                            </>
                          )}
                          {generalActiveTab === "rooms" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-indigo-700 bg-indigo-50/50 select-all border-r border-indigo-100/50">{item.room_code}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-900 font-bold text-sm">
                                    {(() => {
                                      if (item.majors?.faculties?.faculty_name) return item.majors.faculties.faculty_name;
                                      const m = majors.find(x => x.id === item.major_id);
                                      if (m) {
                                        const f = faculties.find(y => y.id === m.faculty_id);
                                        return f?.faculty_name || "-";
                                      }
                                      return "-";
                                    })()}
                                  </span>
                                  <span className="text-gray-500 font-medium text-xs">
                                    {item.majors?.major_name || (() => {
                                      const m = majors.find(x => x.id === item.major_id);
                                      return m?.major_name || "-";
                                    })()}
                                  </span>
                                </div>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => { 
                                  setEditingGeneralId(item.id); 
                                  let formData = { ...item };
                                  if (generalActiveTab === "rooms" && item.major_id) {
                                    const m = majors.find(x => x.id === item.major_id);
                                    if (m) formData._faculty_id = m.faculty_id;
                                  }
                                  setGeneralFormData(formData); 
                                  setIsAddingGeneral(false); 
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors tooltip-trigger"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit2 size={18} strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => handleGeneralDelete(item.id)}
                                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors tooltip-trigger"
                                title="ลบข้อมูล"
                              >
                                <Trash2 size={18} strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
