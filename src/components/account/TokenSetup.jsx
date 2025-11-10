// 📄 src/components/account/TokenSetup.jsx
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import CryptoJS from "crypto-js";
import { Button } from "../ui/button"; // ← אם אין לך עדיין רכיב כזה, אפשר להחליף ב־<button>

export default function TokenSetup({ userEmail, onTokenSaved }) {

  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY;

  // 🔐 הצפנה של הטוקן לפני שמירה
  const encryptToken = (value) => {
    try {
      return CryptoJS.AES.encrypt(value, encryptionKey).toString();
    } catch (err) {
      console.error("שגיאה בהצפנה:", err);
      return null;
    }
  };

  // 💾 שמירה ב-Supabase
  const handleSaveToken = async () => {
    if (!token.trim()) {
      setStatus("⚠️ נא להזין טוקן קודם");
      return;
    }
    if (!userEmail) {
      setStatus("⚠️ לא נמצא מייל משתמש מחובר");
      return;
    }

    setLoading(true);
    setStatus("⏳ שומר את הטוקן שלך...");

    try {
      const encrypted = encryptToken(token);
      if (!encrypted) throw new Error("שגיאה בהצפנה");

      // בדוק אם כבר יש רשומה לחשבון זה
      const { data: existing, error: selectError } = await supabase
        .from("accounts")
        .select("*")
        .eq("owner_email", userEmail)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        throw selectError;
      }

      let response;
      if (existing) {
        // עדכן את הרשומה הקיימת
        response = await supabase
          .from("accounts")
          .update({
            runpod_token_encrypted: encrypted,
            updated_at: new Date(),
          })
          .eq("owner_email", userEmail);
      } else {
        // צור רשומה חדשה
        response = await supabase.from("accounts").insert([
          {
            owner_email: userEmail,
            runpod_token_encrypted: encrypted,
          },
        ]);
      }

      if (response.error) throw response.error;
      setStatus("✅ הטוקן נשמר בהצלחה!");
      if (onTokenSaved) onTokenSaved();
          setToken("");
      
    } catch (err) {
      console.error("❌ שגיאה בשמירת הטוקן:", err);
      setStatus("❌ שמירת הטוקן נכשלה. ראה קונסול לפרטים.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white shadow-lg rounded-2xl text-center">
      <h2 className="text-2xl font-bold mb-3 text-gray-800">הגדרת מפתח RunPod</h2>
      <p className="text-gray-600 mb-6">
        כאן תוכל להזין את מפתח ה־RunPod שלך כדי לאפשר תמלול בענן.{" "}
        <br />
        המפתח יישמר מוצפן בבטחה ב־Supabase.
      </p>

      <input
        type="password"
        placeholder="הדבק כאן את ה־RunPod Token שלך"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 w-full text-center focus:outline-none focus:ring focus:ring-blue-200"
      />

      <Button
        onClick={handleSaveToken}
        disabled={loading}
        className="mt-5 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all"
      >
        {loading ? "שומר..." : "שמור טוקן"}
      </Button>

      {status && (
        <div
          className={`mt-4 p-2 text-sm rounded-lg ${
            status.startsWith("✅")
              ? "bg-green-100 text-green-700"
              : status.startsWith("❌")
              ? "bg-red-100 text-red-700"
              : "bg-yellow-50 text-gray-700"
          }`}
        >
          {status}
        </div>
      )}

      {/* 📺 Placeholder להסבר וסרטון הדרכה */}
      <div className="mt-8 border-t pt-4 text-sm text-gray-500">
        <p>בקרוב: מדריך קצר כיצד להפיק Token אישי מ־RunPod.</p>
        <p className="text-blue-600 underline mt-2 cursor-pointer">
          [כאן יופיע קישור לסרטון ההדרכה]
        </p>
      </div>
    </div>
  );
}
