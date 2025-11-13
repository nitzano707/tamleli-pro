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

  // 🧑‍💼 תפריט משתמש (dropdown)
  const [showMenu, setShowMenu] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "https://my-transcribe-proxy.onrender.com";

  const userEmail = localStorage.getItem("googleUserEmail") || "User";
  const userPicture =
    localStorage.getItem("googleUserPicture") ||
    "https://www.gravatar.com/avatar/?d=mp&s=200";

  // 🧮 פונקציה פנימית לשליפת יתרה
  const fetchBalance = async () => {
    if (!userEmail) return;

    try {
      const res = await fetch(
        `${API_BASE}/effective-balance?user_email=${encodeURIComponent(
          userEmail
        )}`
      );
      const data = await res.json();

      const bal =
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

  // 🟢 טעינה ראשונית של יתרה + סימון checked
  useEffect(() => {
    const init = async () => {
      await fetchBalance();
      setChecked(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // 💰 רענון יתרה אוטומטי כל 30 שניות
  useEffect(() => {
    if (!userEmail) return;
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // 💰 רענון יתרה לפי אירוע גלובלי (כשהתמלול מסתיים ב-UploadBox)
  useEffect(() => {
    const handler = () => {
      fetchBalance();
    };
    window.addEventListener("refreshBalance", handler);
    return () => window.removeEventListener("refreshBalance", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ➕ האזנה לפתיחת מסך הזנת טוקן מבחוץ (UploadBox וכו')
  useEffect(() => {
    const openToken = () => setView("token");
    window.addEventListener("openTokenSetup", openToken);
    return () => window.removeEventListener("openTokenSetup", openToken);
  }, []);

  // ❌ סגירת תפריט המשתמש בלחיצה מחוץ
  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest(".user-menu-root");
      if (!el) setShowMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 🚪 ניהול logout גלובלי (לכל המקומות שמשגרים Event('logout'))
  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem("googleAccessToken");
      localStorage.removeItem("googleUserEmail");
      localStorage.removeItem("googleUserPicture");
      window.location.href = "/";
    };
    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // ⏳ מסך טעינה ראשוני
  if (!checked)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ טוען נתונים...
      </div>
    );

  // 🧭 ניתוב התצוגות
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">

      {/* 🧑‍💼 תפריט משתמש מעוצב בפינה הימנית-עליונה */}
      {effBalance !== null && (
        <div className="fixed top-3 right-4 z-50 user-menu-root">
          {/* כפתור העליון (avatar + מייל + יתרה) */}
          <div
            className="flex items-center gap-3 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl shadow cursor-pointer transition select-none"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
          >
            <img
              src={userPicture}
              className="w-10 h-10 rounded-full border border-gray-300 shadow-sm object-cover"
              alt="User"
            />

            <div className="flex flex-col text-right leading-tight">
              <span className="text-xs text-gray-600 truncate max-w-[180px]">
                {userEmail}
              </span>
              <span className="font-semibold text-gray-900">
                💰 {effBalance}$
              </span>
            </div>
          </div>

          {/* Dropdown תפריט */}
          {showMenu && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-2 text-right animate-fade">
              <div className="px-3 py-2 text-xs text-gray-500 border-b truncate">
                {userEmail}
              </div>

              <button
                className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-800"
                onClick={() => {
                  setView("token");
                  setShowMenu(false);
                }}
              >
                ⚙️ ניהול טוקן
              </button>

              <button
                className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-red-600"
                onClick={() => {
                  window.dispatchEvent(new Event("logout"));
                }}
              >
                🔓 התנתק
              </button>
            </div>
          )}
        </div>
      )}

      {/* גוף האפליקציה לפי view */}
      {view === "dashboard" ? (
        <div className="w-full max-w-5xl text-center">

          {/* כפתורים עליונים במסך הראשי */}
          <div className="flex justify-center gap-4 mb-8 mt-4">
            {/* ⬆️ העלאה חדשה – רק אם יש יתרה חיובית */}
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
                  ⚠️ אין יתרה זמינה.
                  <button
                    onClick={() => setView("token")}
                    className="text-blue-700 underline ml-1"
                  >
                    הזן טוקן →
                  </button>
                </div>
              </div>
            )}

            {/* כפתור התנתקות נוסף (מרכזי) */}
            <button
              onClick={() => window.dispatchEvent(new Event("logout"))}
              className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded-lg"
            >
              🔓 התנתק
            </button>
          </div>

          {/* רשימת התמלולים */}
          <TranscriptionsList
            userEmail={userEmail}
            onOpenTranscription={(record) => {
              setSelectedTranscription(record);
              setView(record?.transcript_id ? "player" : "upload");
            }}
          />
        </div>
      ) : view === "upload" ? (
        <UploadBox
          userEmail={userEmail}
          effBalance={effBalance}
          onBackToDashboard={() => setView("dashboard")}
          existingRecord={selectedTranscription || null}
          selectedTranscription={selectedTranscription}
          setSelectedTranscription={setSelectedTranscription}
        />
      ) : view === "player" && selectedTranscription ? (
        <div className="w-full max-w-6xl text-center">
          <button
            onClick={() => setView("dashboard")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg mb-4 mt-4"
          >
            ⬅️ חזרה לרשימת התמלולים
          </button>
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
        <div className="w-full max-w-5xl text-center mt-6">
          {/* כפתור חזרה למסך הראשי מעל טופס הטוקן */}
          <button
            onClick={() => setView("dashboard")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg mb-6"
          >
            ⬅️ חזרה למסך הראשי
          </button>

          <TokenSetup
            userEmail={userEmail}
            onTokenSaved={() => {
              setHasToken(true);
              // ריענון יתרה מיד אחרי שמירה
              fetchBalance();
              setView("dashboard");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
