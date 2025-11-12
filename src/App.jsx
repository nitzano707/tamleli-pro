// 📄 src/App.jsx
import React, { useEffect, useState } from "react";
import UploadBox from "./components/upload/UploadBox";
import TokenSetup from "./components/account/TokenSetup";
import TranscriptionsList from "./components/dashboard/TranscriptionsList";
import TranscriptPlayer from "./components/player/TranscriptPlayer";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'upload' | 'player'
  const [selectedTranscription, setSelectedTranscription] = useState(null); // ✅ תמלול/רשומה נבחר/ת

  const userEmail = localStorage.getItem("googleUserEmail") || "User";

  // 🟢 בדיקת קיום טוקן ב־Supabase
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data } = await supabase
          .from("accounts")
          .select("runpod_token_encrypted")
          .eq("owner_email", userEmail)
          .maybeSingle();

        if (data?.runpod_token_encrypted) setHasToken(true);
      } catch (err) {
        console.error("⚠️ שגיאה בבדיקת טוקן:", err.message);
      } finally {
        setChecked(true);
      }
    };
    checkToken();
  }, [userEmail]);

  if (!checked)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ טוען נתונים...
      </div>
    );

  // 🧭 ניתוב פנימי: אם אין טוקן → TokenSetup
  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <TokenSetup userEmail={userEmail} onTokenSaved={() => setHasToken(true)} />
      </div>
    );
  }

  // 🧭 אם יש טוקן — דשבורד / העלאה / תמלול חי
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">
      {view === "dashboard" ? (
        <div className="w-full max-w-5xl text-center">
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => {
                setSelectedTranscription(null); // העלאה חדשה → איפוס בחירה
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

              // ✅ ניתוב חכם:
              // יש תמלול → נגן; אין תמלול (אבל יש קובץ) → מסך העלאה/שליחה לתמלול
              if (record?.transcript_id) {
                setView("player");
              } else {
                setView("upload");
              }
            }}
          />
        </div>
      ) : view === "upload" ? (
        <UploadBox
          userEmail={userEmail}
          onBackToDashboard={() => setView("dashboard")}
          // ✅ כשמגיעים מרשימה על פריט ללא תמלול — נעביר את הרשומה ל-UploadBox
          // כדי שיוכל לטעון alias/Folder/Audio ולהציג "תמלל קובץ זה".
          existingRecord={selectedTranscription || null}
          // ✅ נוספו שני פרופס חדשים לסנכרון בזמן אמת
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
            // ✅ תמלול קיים — נטען לפי ה-id מה-Drive
            transcriptId={selectedTranscription.transcript_id}
            // ✅ נגן: נטען את המדיה (אם תרצה, אפשר להחליף בטעינת Blob מאובטחת)
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
