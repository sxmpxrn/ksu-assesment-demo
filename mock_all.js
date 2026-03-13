const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envRaw = {};
envFile.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1) {
        const key = parts.shift().trim();
        const val = parts.join('=').trim().replace(/['"]/g, '');
        envRaw[key] = val;
    }
});

const supabaseUrl = envRaw['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envRaw['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || envRaw['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function add_all_faculties() {
    const selectedRound = 25692;

    // Get current active round details
    const { data: details } = await supabase.from('assessment_detail').select('*').eq('around_id', selectedRound).eq('type', 'score');

    // get all faculties
    const { data: faculties } = await supabase.from('faculties').select('id');

    const studentReq = await supabase.from('students').select('id, room_id, rooms ( majors ( faculty_id ) )');
    const teacherReq = await supabase.from('teacher_relationship').select('teacher_id, room_id, rooms ( majors ( faculty_id ) )');

    let mockAnswers = [];

    if (details && details.length > 0) {
        for (const fac of faculties) {
            // get a student in this faculty
            let stus = studentReq.data?.filter(s => s.rooms?.majors?.faculty_id === fac.id);
            // if no student in this faculty, just pick the first one
            let stu = stus && stus.length > 0 ? stus[0] : studentReq.data[0];

            // get a teacher in this faculty
            let ts = teacherReq.data?.filter(t => t.rooms?.majors?.faculty_id === fac.id);
            let t = ts && ts.length > 0 ? ts[0] : teacherReq.data[0];

            if (stu && t) {
                for (const d of details) {
                    mockAnswers.push({
                        around_id: selectedRound,
                        question_id: d.id,
                        student_id: stu.id,
                        teacher_id: t.teacher_id,
                        score_value: Math.floor(Math.random() * 2) + 3 // 3 to 4
                    });
                }
            }
        }
    }

    console.log(`Inserting ${mockAnswers.length} mock answers for all faculties...`);
    const { error: insErr } = await supabase.from('assessment_answer').insert(mockAnswers);
    if (insErr) console.log("Insert Error:", insErr);

    const { error: rpcErr } = await supabase.rpc('calculate_assessment_summary', { p_around_id: selectedRound });
    console.log("Recalculate error:", rpcErr);

    const { data: q2 } = await supabase.from('avg_faculty').select('faculty_id, total_score').eq('around_id', selectedRound);
    console.log(Array.from(new Set(q2.map(x => x.faculty_id))), " faculties have data now.");
}

add_all_faculties();
