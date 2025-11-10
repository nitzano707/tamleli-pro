// 📦 src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// קריאת משתני הסביבה (מאובטחים דרך .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// בדיקה שהערכים קיימים (מועיל בזמן פיתוח)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ שגיאה: חסרים פרטי חיבור ל-Supabase. בדוק את קובץ .env שלך.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// פונקציה קטנה לבדוק חיבור
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("accounts").select("*").limit(1);
    if (error) throw error;
    console.log("✅ חיבור ל-Supabase תקין:", data?.length ? "יש נתונים" : "אין נתונים בטבלה");
  } catch (err) {
    console.error("⚠️ בעיה בהתחברות ל-Supabase:", err.message);
  }
}
