// 📄 src/components/account/TokenSetup.jsx
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";

/**
 * קומפוננטה לניהול טוקן RunPod האישי של המשתמש
 * ✅ מתקשרת רק עם ה־backend שלך (Render)
 * ✅ לא נוגעת ישירות ב־Supabase
 * ✅ מאובטחת - אין גישה לטוקן בצד הלקוח
 */
export default function TokenSetup({ userEmail, onTokenSaved }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [needToken, setNeedToken] = useState(false);

  // כתובת ה־API של Render
  const API_BASE = import.meta.env.VITE_API_BASE || "https://my-transcribe-proxy.onrender.com";

  // 🧮 בדיקת יתרה ראשונית
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${API_BASE}/effective-balance?user_email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();

        if (data.error) {
          console.warn("⚠️ שגיאה בבדיקת יתרה:", data.error);
          setNeedToken(true);
        } else {
          setBalance(Number(data.balance) || 0);

          setNeedToken(data.need_token ?? false);
        }
      } catch (err) {
        console.error("⚠️ שגיאה בשליפת יתרה:", err);
        setNeedToken(true);
      }
    };

    if (userEmail) fetchBalance();
  }, [userEmail]);

  // 💾 שליחת טוקן חדש לשרת לשמירה ב־Supabase (באמצעות ה־backend)
  const handleSaveToken = async () => {
    if (!token.trim()) {
      setStatus("⚠️ נא להזין טוקן קודם");
      return;
    }

    setLoading(true);
    setStatus("⏳ שומר את הטוקן שלך...");

    try {
      const res = await fetch(`${API_BASE}/save-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          token,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה לא צפויה");

      setStatus("✅ הטוקן נשמר בהצלחה!");
      setNeedToken(false);
      setToken("");
      if (onTokenSaved) onTokenSaved();
    } catch (err) {
      console.error("❌ שגיאה בשמירת טוקן:", err);
      setStatus("❌ שמירת הטוקן נכשלה. ראה קונסול לפרטים.");
    } finally {
      setLoading(false);
    }
  };

  // 🚪 התנתקות
  const handleLogout = () => {
    localStorage.removeItem("googleAccessToken");
    localStorage.removeItem("googleUserEmail");
    window.location.href = "/";
  };

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white shadow-lg rounded-2xl text-center">
      <h2 className="text-2xl font-bold mb-3 text-gray-800">ניהול מפתח RunPod</h2>
      <p className="text-gray-600 mb-6">
        כאן תוכל להזין מפתח RunPod אישי לשימוש באפליקציה.
        <br />
        המפתח שלך יישמר מוצפן בצד השרת.
      </p>

      {/* 🔢 תצוגת יתרה נוכחית */}
      {balance !== null && (
        <div className="mb-5 text-gray-700">
          יתרה נוכחית:{" "}
          <span
            className={`font-bold ${
              balance <= 0.05 ? "text-red-600" : "text-green-700"
            }`}
          >
            ${balance.toFixed(3)}
          </span>{" "}
          {needToken && <span>(יש להזין טוקן אישי)</span>}
        </div>
      )}

      {/* 📥 הזנת טוקן חדש */}
      {needToken && (
        <>
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
        </>
      )}

      {/* 🚪 התנתקות */}
      <Button
        onClick={handleLogout}
        className="mt-5 bg-red-100 hover:bg-red-200 text-red-700 text-sm px-4 py-2 rounded-lg"
      >
        🔓 התנתק מחשבון Google
      </Button>

      {/* הודעות סטטוס */}
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

      {/* הסבר */}
      <div className="mt-8 border-t pt-4 text-sm text-gray-500">
        <p>בקרוב: מדריך קצר כיצד להפיק Token אישי מ־RunPod.</p>
        <p className="text-blue-600 underline mt-2 cursor-pointer">
          [כאן יופיע קישור לסרטון ההדרכה]
        </p>
      </div>
    </div>
  );
}
