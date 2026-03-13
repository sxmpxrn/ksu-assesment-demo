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

async function inject_mock_data() {
    const selectedRound = 25692;

    // 1. Get Details
    const { data: details } = await supabase.from('assessment_detail').select('*').eq('around_id', selectedRound).eq('type', 'score');

    // 2. Clear old answers for around 25692 (if any)
    await supabase.from('assessment_answer').delete().eq('around_id', selectedRound);

    // 3. Clear old averages
    await supabase.from('avg_assessment').delete().eq('around_id', selectedRound);
    await supabase.from('avg_faculty').delete().eq('around_id', selectedRound);

    // 4. Create some users to vote! We need student_id and teacher_id.
    const { data: students } = await supabase.from('students').select('id').limit(4);
    const { data: teachers } = await supabase.from('teachers').select('id').limit(4);

    if (!students || students.length === 0 || !teachers || teachers.length === 0) {
        console.log("No students or teachers found!");
        return;
    }

    const mockAnswers = [];

    for (const stu of students) {
        for (const t of teachers) {
            for (const d of details) {
                const score = Math.floor(Math.random() * 2) + 4; // 4 to 5 just to make graphs look nice
                mockAnswers.push({
                    around_id: selectedRound,
                    question_id: d.id,
                    student_id: stu.id,
                    teacher_id: t.id,
                    score_value: score,
                });
            }
        }
    }

    console.log(`Inserting ${mockAnswers.length} mock answers...`);
    const { error: insErr } = await supabase.from('assessment_answer').insert(mockAnswers);
    if (insErr) console.log("Insert Error:", insErr);
    else console.log("Insert Successful!");

    // Call RPC
    console.log("Calling calculate_assessment_summary...");
    const { error: rpcErr } = await supabase.rpc('calculate_assessment_summary', { p_around_id: selectedRound });
    if (rpcErr) console.log("RPC Error:", rpcErr);
    else console.log("RPC Successful!");

    const { data: q } = await supabase.from('avg_assessment').select('*').limit(2);
    console.log("Test fetching new avg_assessment:", q);
}

inject_mock_data();
