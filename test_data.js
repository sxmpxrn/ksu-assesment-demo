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

async function inspect_other_avgs() {
    const selectedRound = 25692;

    const { data: q1, error: e1 } = await supabase.from('avg_major').select('*').limit(2);
    console.log("avg_major err:", e1, " data:", q1);

    const { data: q2, error: e2 } = await supabase.from('avg_faculty').select('*').limit(2);
    console.log("avg_faculty err:", e2, " data:", q2);
}

inspect_other_avgs();
