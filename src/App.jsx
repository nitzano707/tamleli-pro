// 📄 src/App.jsx
import React, { useEffect, useState } from "react";
import UploadBox from "./components/upload/UploadBox";
import TokenSetup from "./components/account/TokenSetup";
import TranscriptionsList from "./components/dashboard/TranscriptionsList";
import TranscriptPlayer from "./components/player/TranscriptPlayer";

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'upload' | 'player'
  const [selectedTranscription, setSelectedTranscription] = useState(null);

  // 💰 יתרה אפקטיבית
  const [effBalance, setEffBalance] = useState(null);
  const [needToken, setNeedToken] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "https://my-transcribe-proxy.onrender.com";
  const userEmail = localStorage.getItem("googleUserEmail") || "User";

  // 🟢 בדיקת מצב המשתמש דרך השרת (במקום קריאה ל-Supabase)
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!userEmail) return;
      try {
        const res = await fetch(
          `${API_BASE}/effective-balance?user_email=${encodeURIComponent(userEmail)}`
        );
        const data = await res.json();

        if (res.ok) {
        // תומך גם במחרוזת ("0.490001") וגם במספר
        let bal =
          typeof data.balance === "string"
            ? parseFloat(data.balance)
            : data.balance;

        if (!isNaN(bal)) {
          setEffBalance(bal.toFixed(6));   // מציג 6 ספרות אחרי הנקודה
        }

        setNeedToken(Boolean(data.need_token));
        setHasToken(!data.need_token);
      } else {
        console.error("⚠️ שגיאה בבדיקת חשבון:", data.error || data);
      }

      } catch (err) {
        console.error("❌ שגיאה בבדיקת חשבון:", err);
      } finally {
        setChecked(true);
      }
    };
    checkAccountStatus();
  }, [userEmail]);

  // 💰 שליפת יתרה אפקטיבית ורענון חכם
  useEffect(() => {
    if (!userEmail) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/effective-balance?user_email=${encodeURIComponent(
            userEmail
          )}`
        );
        const data = await res.json();

        // תמיכה גם במחרוזת וגם במספר
        let bal =
          typeof data.balance === "string"
            ? parseFloat(data.balance)
            : data.balance;

        if (!isNaN(bal)) {
          setEffBalance(bal.toFixed(6));
        }

        setNeedToken(Boolean(data.need_token));

        if (data.need_token) {
          setHasToken(false);
          setView("token");
        }
      } catch (err) {
        console.error("⚠️ שגיאה בשליפת יתרה אפקטיבית:", err);
      }
    };


    // 🪙 טען יתרה פעם אחת עם פתיחת המסך
    fetchBalance();

    // 🪙 רענון יזום ע"י מודולים אחרים (כמו UploadBox.jsx)
    const handleRefreshBalance = () => fetchBalance();
    window.addEventListener("refreshBalance", handleRefreshBalance);

    return () => window.removeEventListener("refreshBalance", handleRefreshBalance);
  }, [userEmail]);

  // 🕒 תצוגת טעינה בזמן בדיקה
  if (!checked)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ טוען נתונים...
      </div>
    );

  // 🧭 אם אין טוקן או נגמרה יתרה — מעבר למסך הזנת טוקן
  if (!hasToken) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50">
        {/* 💰 הצגת יתרה בפינה גם במסך טוקן */}
        {effBalance !== null && (
          <div className="absolute top-3 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow text-sm text-gray-800">
          💰 יתרה: ${Number(effBalance).toFixed(6)}



          </div>
        )}
        <TokenSetup userEmail={userEmail} onTokenSaved={() => setHasToken(true)} />
      </div>
    );
  }

  // 🧭 אם יש טוקן — מציגים את הדשבורד / העלאה / נגן
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">
      {/* 💰 תצוגת יתרה גלובלית */}
      {effBalance !== null && (
        <div className="fixed top-3 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow text-sm text-gray-800 z-50">
          💰 יתרה: ${effBalance}
        </div>
      )}

      {/* דשבורד / העלאה / נגן */}
      {view === "dashboard" ? (
        <div className="w-full max-w-5xl text-center">
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => {
                setSelectedTranscription(null);
                setView("upload");
              }}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
            >
              ⬆️ העלאה חדשה
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("logout"))}
              className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded-lg"
            >
              🔓 התנתק
            </button>
          </div>

          <TranscriptionsList
            userEmail={userEmail}
            onOpenTranscription={(record) => {
              console.log("🟢 תמלול נפתח: ", record);
              setSelectedTranscription(record);
              if (record?.transcript_id) setView("player");
              else setView("upload");
            }}
          />
        </div>
      ) : view === "upload" ? (
        <UploadBox
          userEmail={userEmail}
          onBackToDashboard={() => setView("dashboard")}
          existingRecord={selectedTranscription || null}
          selectedTranscription={selectedTranscription}
          setSelectedTranscription={setSelectedTranscription}
        />
      ) : view === "player" && selectedTranscription ? (
        <div className="w-full max-w-6xl text-center">
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setView("dashboard")}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
            >
              ⬅️ חזרה לרשימת התמלולים
            </button>
          </div>
          <TranscriptPlayer
            transcriptId={selectedTranscription.transcript_id}
            mediaUrl={
              selectedTranscription?.audio_id
                ? `https://drive.google.com/uc?id=${selectedTranscription.audio_id}`
                : ""
            }
            mediaType={selectedTranscription?.media_type || "audio"}
          />
        </div>
      ) : null}
    </div>
  );
}
