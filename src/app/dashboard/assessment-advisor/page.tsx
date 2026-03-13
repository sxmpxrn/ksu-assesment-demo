"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import AdvisorDashboard from "./_components/AdvisorDashboard";
import AssessmentForm from "./_components/AssessmentForm";
import type { Section, Question } from "./_components/AssessmentForm";
import type { AssessmentRound, Advisor } from "./_components/AdvisorDashboard";

// --- Main Page (Orchestrator) ---
export default function AssessmentAdvisorPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [view, setView] = useState<"dashboard" | "form">("dashboard");

  // --- User State ---
  const [studentData, setStudentData] = useState<any>(null);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [isAlreadyAssessed, setIsAlreadyAssessed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Dashboard State ---
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState<string[]>([]);

  // --- Form State ---
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAround, setSelectedAround] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});

  // --- Auth Check ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/login");
    };
    checkAuth();
  }, [router, supabase]);

  // --- Fetch User Data & Completed Assessments ---
  const fetchUserData = useCallback(async () => {
    if (!supabase) return;
    setUserDataLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUserDataLoading(false); return; }

      // Fetch Student Data
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          rooms!room_id (
            id,
            room_code,
            majors (
               faculties (
                 faculty_name
               )
            )
          )
        `)
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        const room = data.rooms as any;

        // Fetch Advisors via teacher_relationship
        let allAdvisors: Advisor[] = [];
        if (room?.id) {
          const { data: relationData, error: relationError } = await supabase
            .from("teacher_relationship")
            .select(`
                teachers (
                  id,
                  title_name,
                  first_name,
                  last_name
                )
            `)
            .eq("room_id", room.id);

          if (relationError) console.error("Error fetching advisors:", relationError.message || relationError);

          if (relationData) {
            allAdvisors = relationData
              .map((item: any) => {
                const t = Array.isArray(item.teachers) ? item.teachers[0] : item.teachers;
                if (!t) return null;
                const fullName = `${t.title_name || ""}${t.first_name || ""} ${t.last_name || ""}`.trim();
                return { id: t.id, fullName: fullName || "ไม่ระบุชื่ออาจารย์" };
              })
              .filter(Boolean) as Advisor[];
          }
        }
        setAdvisors(allAdvisors);

        const facultyName = room?.majors?.faculties?.faculty_name || "มหาวิทยาลัยกาฬสินธุ์";
        setStudentData({ ...data, room_code: room?.room_code || "ยังไม่อยู่ในห้อง", std_faculty: facultyName });

        // Fetch Completed Assessments
        const { data: assessments } = await supabase
          .from("assessment_answer")
          .select("around_id, teacher_id")
          .eq("student_id", data.id);

        if (assessments) {
          const keys = Array.from(new Set(assessments.map((a: any) => `${a.around_id}-${a.teacher_id}`))) as string[];
          setCompletedAssessments(keys);
        }
      }
    } catch {
      alert("กรอกข้อมูลพื้นฐานก่อน");
    } finally {
      setUserDataLoading(false);
    }
  }, [supabase]);

  useEffect(() => { if (supabase) fetchUserData(); }, [supabase, fetchUserData]);

  // --- Fetch Rounds ---
  useEffect(() => {
    if (!supabase) return;
    const fetchRounds = async () => {
      setDashboardLoading(true);
      try {
        const { data, error } = await supabase
          .from("assessment_detail")
          .select("around_id, start_date, end_date")
          .order("around_id", { ascending: false });

        if (!error && data) {
          const uniqueRounds = Array.from(
            new Map(data.map((item: any) => [item.around_id, item])).values(),
          ) as AssessmentRound[];
          setRounds(uniqueRounds);
        }
      } catch (err) { console.error("Error:", err); }
      finally { setDashboardLoading(false); }
    };
    fetchRounds();
  }, [supabase]);

  // --- Check if already assessed ---
  useEffect(() => {
    const checkExisting = async () => {
      if (supabase && studentData?.id && selectedAdvisorId && selectedAround) {
        const { count, error } = await supabase
          .from("assessment_answer")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentData.id)
          .eq("teacher_id", selectedAdvisorId)
          .eq("around_id", selectedAround);
        setIsAlreadyAssessed(!error && !!count && count > 0);
      }
    };
    checkExisting();
  }, [studentData?.id, selectedAdvisorId, selectedAround, supabase]);

  // --- Fetch Form Data ---
  const fetchAssessmentData = async (aroundId: number) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: headData, error: headError } = await supabase
        .from("assessment_head")
        .select("*")
        .eq("around_id", aroundId)
        .order("section1", { ascending: true });

      if (headError) throw headError;

      const { data: detailData, error: detailError } = await supabase
        .from("assessment_detail")
        .select("*")
        .eq("around_id", aroundId)
        .order("section1", { ascending: true })
        .order("section2", { ascending: true });

      if (detailError) throw detailError;

      const mappedSections: Section[] = (headData || []).map((h: any) => ({
        id: h.id,
        section1: h.section1,
        head_description: h.head_description || "",
        description: h.description || "",
        around_id: h.around_id,
      }));

      const processedQuestions: Question[] = (detailData || []).map((d: any) => ({
        id: d.id,
        type: d.type === "score" ? "scale" : d.type,
        question_text: d.detail,
        start_score: d.min_score,
        end_score: d.max_score,
        around_id: d.around_id,
        section1: d.section1,
        section2: d.section2,
      }));

      setSections(mappedSections);
      setQuestions(processedQuestions);
      setView("form");
    } catch (error) {
      console.error("Error fetching assessment details:", error);
      alert("ไม่สามารถโหลดข้อมูลแบบประเมินได้");
      setSelectedAround(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAround && supabase) fetchAssessmentData(selectedAround);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAround, supabase]);

  // --- Handlers ---
  const handleSelectRound = (roundId: number, advisorId: string) => {
    setSelectedAdvisorId(advisorId);
    setSelectedAround(roundId);
    setAnswers({});
    setIsAlreadyAssessed(false);
  };

  const handleBack = () => {
    setView("dashboard");
    setSelectedAround(null);
    setSelectedAdvisorId(null);
    fetchUserData();
  };

  const handleAnswerChange = (qId: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSave = async () => {
    if (!selectedAround || !selectedAdvisorId || !studentData || !supabase) return;

    const scaleQuestions = questions.filter((q) => q.type === "scale");
    const unansweredCount = scaleQuestions.filter((q) => !answers[q.id]).length;

    if (unansweredCount > 0) {
      alert(`กรุณาตอบคำถามให้ครบทุกข้อ (ยังเหลือ ${unansweredCount} ข้อ)`);
      return;
    }

    if (isAlreadyAssessed) {
      alert("ท่านได้ทำการประเมินอาจารย์ท่านนี้ในรอบนี้ไปแล้ว");
      return;
    }

    setIsSubmitting(true);
    try {
      const answersPayload = questions.map((q) => {
        let score_value = null;
        let text_value = null;
        if (q.type === "scale") {
          score_value = answers[q.id] ? Number(answers[q.id]) : null;
        } else {
          text_value = answers[q.id] ? String(answers[q.id]) : "";
        }
        return { question_id: q.id, score_value, text_value };
      });

      const { error } = await supabase.rpc("submit_assessment", {
        p_teacher_id: selectedAdvisorId,
        p_around_id: selectedAround,
        p_answers: answersPayload,
      });

      if (error) {
        console.error("Database validation error:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        if (error.message.includes("ส่งคำตอบสำหรับข้อนี้ไปแล้ว") || error.message.includes("ซ้ำซ้อน")) {
          setIsAlreadyAssessed(true);
        }
        return;
      }

      alert("บันทึกข้อมูลการประเมินเรียบร้อยแล้ว");
      handleBack();
    } catch (err: any) {
      console.error("Save exception:", err);
      alert("เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  if (view === "dashboard") {
    return (
      <AdvisorDashboard
        studentData={studentData}
        advisors={advisors}
        rounds={rounds}
        completedAssessments={completedAssessments}
        userDataLoading={userDataLoading}
        dashboardLoading={dashboardLoading}
        onSelectRound={handleSelectRound}
      />
    );
  }

  return (
    <AssessmentForm
      selectedAround={selectedAround!}
      selectedAdvisorId={selectedAdvisorId!}
      studentData={studentData}
      advisors={advisors}
      sections={sections}
      questions={questions}
      answers={answers}
      isAlreadyAssessed={isAlreadyAssessed}
      isSubmitting={isSubmitting}
      loading={loading}
      onAnswerChange={handleAnswerChange}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}