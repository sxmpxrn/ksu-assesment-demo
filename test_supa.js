require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from("teacher_relationship").select(`
    id,
    teacher:teacher_id (*),
    room:room_id (
      id, room_code, majors ( faculty_id )
    )
  `);
    console.log("Error:", JSON.stringify(error, null, 2));
    console.log("Data:", data ? data.slice(0, 1) : null);
}
test();
