// 📄 src/App.jsx
import React, { useEffect, useState } from "react";
import UploadBox from "./components/upload/UploadBox";
import TokenSetup from "./components/account/TokenSetup";
import TranscriptionsList from "./components/dashboard/TranscriptionsList";
import TranscriptPlayer from "./components/player/TranscriptPlayer";

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'upload' | 'player' | 'token'
  const [selectedTranscription, setSelectedTranscription] = useState(null);

  // 💰 יתרה אפקטיבית
  const [effBalance, setEffBalance] = useState(null);
  const [needToken, setNeedToken] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "https://my-transcribe-proxy.onrender.com";
  const userEmail = localStorage.getItem("googleUserEmail") || "User";

  // 🟢 בדיקת מצב חשבון בסיסית
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!userEmail) return;
      try {
        const res = await fetch(
          `${API_BASE}/effective-balance?user_email=${encodeURIComponent(
            userEmail
          )}`
        );
        const data = await res.json();

        let bal =
          typeof data.balance === "string"
            ? parseFloat(data.balance)
            : data.balance;

        if (!isNaN(bal)) {
          setEffBalance(bal.toFixed(6));
        }

        setNeedToken(Boolean(data.need_token));
        setHasToken(!data.need_token);
      } catch (err) {
        console.error("❌ שגיאה בבדיקת חשבון:", err);
      } finally {
        setChecked(true);
      }
    };

    checkAccountStatus();
  }, [userEmail]);

  // ➕ האזנה לפתיחת מסך הזנת טוקן
  useEffect(() => {
    const openToken = () => setView("token");
    window.addEventListener("openTokenSetup", openToken);
    return () => window.removeEventListener("openTokenSetup", openToken);
  }, []);

  // 💰 שליפת יתרה ורענון
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

        let bal =
          typeof data.balance === "string"
            ? parseFloat(data.balance)
            : data.balance;

        if (!isNaN(bal)) {
          setEffBalance(bal.toFixed(6));
        }

        setNeedToken(Boolean(data.need_token));
        setHasToken(!data.need_token);
      } catch (err) {
        console.error("⚠️ שגיאה בשליפת יתרה אפקטיבית:", err);
      }
    };

    fetchBalance();

    const handleRefreshBalance = () => fetchBalance();
    window.addEventListener("refreshBalance", handleRefreshBalance);

    return () =>
      window.removeEventListener("refreshBalance", handleRefreshBalance);
  }, [userEmail]);

  // 📌 טעינת נתונים ראשונית
  if (!checked)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ טוען נתונים...
      </div>
    );

  // 🧭 ניתוב התצוגות
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">

      {/* 💰 תצוגת יתרה גלובלית */}
      {effBalance !== null && (
        <div className="fixed top-3 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow text-sm text-gray-800 z-50">
          💰 יתרה: ${effBalance}
        </div>
      )}

      {/* תצוגות */}
      {view === "dashboard" ? (
        <div className="w-full max-w-5xl text-center">

          <div className="flex justify-center gap-4 mb-8">

            {/* ⬆️ כפתור העלאה חדשה – מושבת כשאין יתרה */}
            {effBalance > 0 ? (
              <button
                onClick={() => {
                  setSelectedTranscription(null);
                  setView("upload");
                }}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
              >
                ⬆️ העלאה חדשה
              </button>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  disabled
                  className="bg-gray-200 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="אין יתרה — לא ניתן להעלות קובץ חדש"
                >
                  ⬆️ העלאה חדשה
                </button>

                <div className="mt-2 text-red-600 text-sm">
                  ⚠️ אין יתרה זמינה להעלאת קבצים.
                  <button
                    onClick={() => window.dispatchEvent(new Event("openTokenSetup"))}
                    className="text-blue-700 underline ml-1"
                  >
                    הזן טוקן →
                  </button>
                </div>
              </div>
            )}


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
              setSelectedTranscription(record);
              if (record?.transcript_id) setView("player");
              else setView("upload");
            }}
          />
        </div>
      ) : view === "upload" ? (
        <UploadBox
          userEmail={userEmail}
          effBalance={effBalance} // 👈 חשוב!
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

      ) : view === "token" ? (
        <TokenSetup
          userEmail={userEmail}
          onTokenSaved={() => {
            setHasToken(true);
            setView("dashboard");
          }}
        />

      ) : null}
    </div>
  );
}
