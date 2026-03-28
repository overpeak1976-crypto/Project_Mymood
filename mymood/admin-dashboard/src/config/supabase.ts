import { createClient } from '@supabase/supabase-js';

// ✅ เปลี่ยนจาก process.env เป็น import.meta.env แบบนี้ครับ
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key in .env file");
}

console.log("URL:", supabaseUrl);
console.log("KEY:", supabaseKey ? "Found!" : "Not Found!");

export const supabase = createClient(supabaseUrl, supabaseKey);