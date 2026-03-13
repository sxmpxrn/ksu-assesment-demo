const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .from("students")
        .select(`
      *,
      rooms!room_id (
        id,
        room_code
      )
    `)
        .limit(1);

    console.log("With !room_id:");
    console.log(data, error?.message);

    const { data: data2, error: err2 } = await supabase
        .from("students")
        .select(`
      *,
      rooms:room_id (
        id,
        room_code
      )
    `)
        .limit(1);

    console.log("With :room_id:");
    console.log(data2, err2?.message);
}

test();
