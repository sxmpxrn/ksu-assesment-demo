"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Building2, Plus, X, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    profileId: string;
    faculties: any[];
    majors: any[];
    allRooms: any[];
    myRooms: any[];
}

export default function AddRoomModal({
    isOpen,
    onClose,
    onSuccess,
    profileId,
    faculties,
    majors,
    allRooms,
    myRooms,
}: AddRoomModalProps) {
    const [selectedRoomToAdd, setSelectedRoomToAdd] = useState("");
    const [selectedFacultyToAdd, setSelectedFacultyToAdd] = useState("");
    const [selectedMajorToAdd, setSelectedMajorToAdd] = useState("");
    const [roomCodeToAdd, setRoomCodeToAdd] = useState("");
    const [addingResult, setAddingResult] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addingRoomCode, setAddingRoomCode] = useState(false);

    if (!isOpen) return null;

    const unassignedRooms = allRooms.filter(
        (ar) => !myRooms.some((mr) => mr.id === ar.id),
    );

    const handleAddRoom = async () => {
        let roomIdToAssign = Number(selectedRoomToAdd);

        if (addingRoomCode) {
            if (!selectedMajorToAdd || !roomCodeToAdd.trim()) {
                setAddingResult({
                    type: "error",
                    text: "กรุณาระบุสาขาวิชาและรหัสห้องเรียน",
                });
                return;
            }
        } else {
            if (!roomIdToAssign) {
                setAddingResult({ type: "error", text: "กรุณาเลือกห้องเรียน" });
                return;
            }
        }

        if (!profileId) return;

        setIsAdding(true);
        setAddingResult(null);
        try {
            const supabase = createClient();

            if (addingRoomCode) {
                // Check if room exists
                const { data: existingRoom } = await supabase
                    .from("rooms")
                    .select("id")
                    .eq("major_id", Number(selectedMajorToAdd))
                    .eq("room_code", roomCodeToAdd.trim())
                    .single();

                if (existingRoom) {
                    roomIdToAssign = existingRoom.id;
                } else {
                    // Create new room
                    const { data: newRoom, error: roomInsertError } = await supabase
                        .from("rooms")
                        .insert({
                            major_id: Number(selectedMajorToAdd),
                            room_code: roomCodeToAdd.trim(),
                            created_by: profileId,
                        })
                        .select("id")
                        .single();

                    if (roomInsertError) throw roomInsertError;
                    if (newRoom) roomIdToAssign = newRoom.id;
                }
            }

            if (!roomIdToAssign) {
                throw new Error("Could not determine room ID");
            }

            // Check if relationship already exists
            const { data: existingRel } = await supabase
                .from("teacher_relationship")
                .select("id")
                .eq("teacher_id", profileId)
                .eq("room_id", roomIdToAssign)
                .single();

            if (existingRel) {
                setAddingResult({ type: "error", text: "คุณดูแลห้องเรียนนี้อยู่แล้ว" });
                setIsAdding(false);
                return;
            }

            // Insert new relation
            const { error } = await supabase.from("teacher_relationship").insert({
                teacher_id: profileId,
                room_id: roomIdToAssign,
            });

            if (error) {
                throw error;
            } else {
                setAddingResult({
                    type: "success",
                    text: "เพิ่มห้องเรียนเข้าสู่การดูแลสำเร็จ",
                });
                onSuccess(); // Refresh list
                setTimeout(() => {
                    onClose();
                    setSelectedRoomToAdd("");
                    setSelectedFacultyToAdd("");
                    setSelectedMajorToAdd("");
                    setRoomCodeToAdd("");
                    setAddingRoomCode(false);
                    setAddingResult(null);
                }, 1500);
            }
        } catch (error: any) {
            console.error("Add room error info:", error);

            // Extract meaningful message if it's a Supabase error
            const errorMessage = error?.message || error?.error_description || "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

            setAddingResult({
                type: "error",
                text: `บันทึกไม่สำเร็จ: ${errorMessage}`,
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => !isAdding && onClose()}
            ></div>

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
                <div className="bg-[#7ca3d5] text-white p-6 md:p-8 relative">
                    <button
                        onClick={onClose}
                        disabled={isAdding}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>

                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 border border-white/20">
                        <Building2 size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight mb-1">
                        เพิ่มห้องเรียน
                    </h2>
                    <p className="text-white/80 text-sm font-medium">
                        เลือกห้องเรียนที่ต้องการเพิ่มเป็นความรับผิดชอบของคุณ
                    </p>
                </div>

                <div className="p-6 md:p-8">
                    {addingResult && (
                        <div
                            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold mb-6 ${addingResult.type === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                        >
                            {addingResult.type === "success" ? (
                                <CheckCircle size={20} className="shrink-0" />
                            ) : (
                                <AlertCircle size={20} className="shrink-0" />
                            )}
                            <p>{addingResult.text}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {addingRoomCode ? (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                                        เพิ่มห้องเรียนใหม่เข้าสู่ระบบ
                                    </label>
                                    <button
                                        onClick={() => {
                                            setAddingRoomCode(false);
                                            setSelectedFacultyToAdd("");
                                            setSelectedMajorToAdd("");
                                            setRoomCodeToAdd("");
                                        }}
                                        className="text-xs text-[#7ca3d5] font-bold hover:underline"
                                    >
                                        กลับไปเลือกห้องที่มีอยู่
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        คณะ (Faculty) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedFacultyToAdd}
                                        onChange={(e) => {
                                            setSelectedFacultyToAdd(e.target.value);
                                            setSelectedMajorToAdd("");
                                        }}
                                        disabled={isAdding}
                                        className="w-full appearance-none px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="" disabled>
                                            -- กรุณาเลือกคณะ --
                                        </option>
                                        {faculties.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.faculty_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        สาขาวิชา (Major) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedMajorToAdd}
                                        onChange={(e) => setSelectedMajorToAdd(e.target.value)}
                                        disabled={isAdding || !selectedFacultyToAdd}
                                        className="w-full appearance-none px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="" disabled>
                                            -- กรุณาเลือกสาขาวิชา --
                                        </option>
                                        {majors
                                            .filter(
                                                (m) =>
                                                    m.faculty_id === Number(selectedFacultyToAdd),
                                            )
                                            .map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.major_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        รหัสห้อง / ชื่อห้อง (Room Code){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={roomCodeToAdd}
                                        onChange={(e) => setRoomCodeToAdd(e.target.value)}
                                        disabled={isAdding}
                                        placeholder="เช่น 1/1, CS-101"
                                        className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    />
                                    <p className="mt-2 text-xs text-gray-500 font-medium">
                                        ห้องเรียนจะถูกเชื่อมโยงมาให้คุณดูแลโดยอัตโนมัติ
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                                        เลือกห้องเรียนที่มีในระบบ
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        คณะ (Faculty)
                                    </label>
                                    <select
                                        value={selectedFacultyToAdd}
                                        onChange={(e) => {
                                            setSelectedFacultyToAdd(e.target.value);
                                            setSelectedMajorToAdd("");
                                            setSelectedRoomToAdd("");
                                        }}
                                        disabled={isAdding}
                                        className="w-full appearance-none px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="" disabled>
                                            -- กรุณาเลือกคณะ --
                                        </option>
                                        {faculties.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.faculty_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        สาขาวิชา (Major)
                                    </label>
                                    <select
                                        value={selectedMajorToAdd}
                                        onChange={(e) => {
                                            setSelectedMajorToAdd(e.target.value);
                                            setSelectedRoomToAdd("");
                                        }}
                                        disabled={isAdding || !selectedFacultyToAdd}
                                        className="w-full appearance-none px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="" disabled>
                                            -- กรุณาเลือกสาขาวิชา --
                                        </option>
                                        {majors
                                            .filter(
                                                (m) =>
                                                    m.faculty_id === Number(selectedFacultyToAdd),
                                            )
                                            .map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.major_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                        ห้องเรียน
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedRoomToAdd}
                                            onChange={(e) => setSelectedRoomToAdd(e.target.value)}
                                            disabled={
                                                isAdding ||
                                                !selectedMajorToAdd ||
                                                unassignedRooms.filter(
                                                    (r) => r.major_id === Number(selectedMajorToAdd),
                                                ).length === 0
                                            }
                                            className="flex-1 appearance-none px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:border-[#7ca3d5] focus:ring-4 focus:ring-[#7ca3d5]/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                                        >
                                            <option value="" disabled>
                                                -- กรุณาเลือกห้องเรียน --
                                            </option>
                                            {unassignedRooms
                                                .filter(
                                                    (r) => r.major_id === Number(selectedMajorToAdd),
                                                )
                                                .map((room) => (
                                                    <option key={room.id} value={room.id}>
                                                        ห้อง {room.room_code}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    {unassignedRooms.filter(
                                        (r) => r.major_id === Number(selectedMajorToAdd),
                                    ).length === 0 &&
                                        selectedMajorToAdd && (
                                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md font-medium border border-amber-100 flex items-center gap-1">
                                                <AlertCircle size={14} />{" "}
                                                ไม่มีห้องเรียนในสาขานี้ที่ยังไม่ได้ดูแล
                                            </p>
                                        )}
                                    {!selectedMajorToAdd && selectedFacultyToAdd && (
                                        <p className="mt-2 text-xs text-gray-500 font-medium">
                                            กรุณาเลือกสาขาวิชาเพื่อดูห้องเรียน
                                        </p>
                                    )}
                                </div>

                                <div className="pt-1 text-center">
                                    <button
                                        onClick={() => {
                                            setAddingRoomCode(true);
                                            setSelectedRoomToAdd("");
                                        }}
                                        className="text-xs text-[#e51c23] font-bold hover:text-[#e51c23] inline-flex items-center gap-1"
                                    >
                                        <Plus size={13} /> ห้องเรียนที่ต้องการไม่มีในรายการ?
                                        เพิ่มห้องเรียนใหม่
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isAdding}
                                className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAddRoom}
                                disabled={
                                    isAdding ||
                                    (addingRoomCode
                                        ? !selectedMajorToAdd || !roomCodeToAdd.trim()
                                        : !selectedRoomToAdd)
                                }
                                className="flex-1 py-3 bg-[#7ca3d5] text-white font-bold rounded-xl shadow-lg shadow-[#7ca3d5]/30 hover:bg-[#6890c3] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isAdding ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                {isAdding ? "กำลังบันทึก..." : "ยืนยันการเพิ่ม"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
