// 📄 src/App.jsx
import React, { useEffect, useState } from "react";
import UploadBox from "./components/upload/UploadBox";
import TokenSetup from "./components/account/TokenSetup";
import TranscriptionsList from "./components/dashboard/TranscriptionsList";
import TranscriptPlayer from "./components/player/TranscriptPlayer";

// 🆕 ניהול קבוצה
import GroupManager from "./components/account/GroupManager";
import { leaveGroup, getMembersForOwner } from "./lib/groupManager";

// 🆕 אודות
import About from "./components/about/About";

// 🆕 קבלת user + groupInfo מהפרופס
export default function App({ user, groupInfo }) {
  const [hasToken, setHasToken] = useState(false);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'upload' | 'player' | 'token' | 'group' | 'about'

  const [selectedTranscription, setSelectedTranscription] = useState(null);

  // 💰 יתרה אפקטיבית
  const [effBalance, setEffBalance] = useState(null);
  const [needToken, setNeedToken] = useState(false);

  // 🧑‍💼 תפריט משתמש (dropdown)
  const [showMenu, setShowMenu] = useState(false);

  // 🆕 מספר חברים בקבוצה
  const [groupMemberCount, setGroupMemberCount] = useState(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "https://my-transcribe-proxy.onrender.com";

  // 🆕 בחירת המייל שמייצג את המשתמש מבחינת טוקן
  const tokenEmail =
    groupInfo?.type === "group" ? groupInfo.ownerEmail : user?.email;

  // 🧩 המייל לתצוגה
  const userEmail =
    user?.email || localStorage.getItem("googleUserEmail") || "User";

  const userPicture =
    localStorage.getItem("googleUserPicture") ||
    "https://www.gravatar.com/avatar/?d=mp&s=200";

  // 🆕 טוען את מספר חברי הקבוצה (רק אם Owner)
  useEffect(() => {
    async function loadMembers() {
      if (groupInfo?.type === "personal") {
        const members = await getMembersForOwner(userEmail);
        setGroupMemberCount((members.length || 0) + 1); // כולל Owner
      } else {
        setGroupMemberCount(null);
      }
    }
    loadMembers();
  }, [groupInfo, userEmail]);

  // 🧮 תווית היתרה (אישי / קבוצתי)
  const balanceLabel = () => {
    if (groupInfo?.type === "group") {
      return "(יתרת קבוצה)";
    }
    if (groupInfo?.type === "personal" && groupMemberCount > 1) {
      return `(יתרת קבוצתית — ${groupMemberCount} משתמשים)`;
    }
    return "(יתרה אישית)";
  };

  // 🧮 פונקציה פנימית לשליפת יתרה
  const fetchBalance = async () => {
    if (!tokenEmail) return;

    try {
      const res = await fetch(
        `${API_BASE}/effective-balance?user_email=${encodeURIComponent(
          tokenEmail
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

      // 🆕 רענון מספר חברי הקבוצה (Owner בלבד)
      if (groupInfo?.type === "personal") {
        const members = await getMembersForOwner(userEmail);
        setGroupMemberCount((members.length || 0) + 1);
      }

      setNeedToken(Boolean(data.need_token));
      setHasToken(!data.need_token);
    } catch (err) {
      console.error("⚠️ שגיאה בשליפת יתרה אפקטיבית:", err);
    }
  };

  // 🟢 טעינה ראשונית
  useEffect(() => {
    const init = async () => {
      await fetchBalance();
      setChecked(true);
    };
    init();
  }, [tokenEmail]);

  // 💰 רענון יתרה כל 30 שניות
  useEffect(() => {
    if (!tokenEmail) return;
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [tokenEmail]);

  // 💰 רענון לפי אירוע גלובלי
  useEffect(() => {
    const handler = () => fetchBalance();
    window.addEventListener("refreshBalance", handler);
    return () => window.removeEventListener("refreshBalance", handler);
  }, []);

  // ➕ פתיחת מסך הזנת טוקן מבחוץ
  useEffect(() => {
    const openToken = () => setView("token");
    window.addEventListener("openTokenSetup", openToken);
    return () => window.removeEventListener("openTokenSetup", openToken);
  }, []);

  // ❌ סגירת תפריט משתמש בלחיצה מחוץ
  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest(".user-menu-root");
      if (!el) setShowMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 🚪 ניהול logout גלובלי
  useEffect(() => {
    const handleLogout = () => {
      localStorage.clear();
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

  // 🧭 ניתוב התצוגה
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">

      {/* 🧑‍💼 תפריט משתמש בפינה */}
      {effBalance !== null && (
        <div
          key={`${effBalance}-${groupInfo?.type}-${groupMemberCount}`}
          className="fixed top-3 right-4 z-50 user-menu-root"
        >
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

              {(() => {
                const bal = parseFloat(effBalance || "0");
                const credits = (bal * 100).toFixed(2);

                if (bal <= 0) {
                  return (
                    <span className="flex flex-col text-right leading-tight">
                      <span className="font-semibold text-gray-900">
                        🎟️ קרדיט: 0.00
                        <span className="text-xs text-blue-600 ml-1">
                          {balanceLabel()}
                        </span>
                      </span>

                      <span className="text-[11px] text-red-600 mt-0.5 flex flex-col">
                        ❌ אין יתרת קרדיט זמינה לתמלול
                        <button
                          onClick={() => setView("token")}
                          className="text-blue-700 underline mt-0.5 text-[11px]"
                        >
                          עבור למסך הזנת טוקן אישי חדש →
                        </button>
                      </span>
                    </span>
                  );
                }

                const processingSec = bal / 0.00016;
                const audioSec = processingSec / 0.08;

                const h = Math.floor(audioSec / 3600);
                const m = Math.floor((audioSec % 3600) / 60);

                let timeStr = "";
                if (h > 0) timeStr = `${h} שעות ו־${m} דקות`;
                else if (m > 0) timeStr = `${m} דקות`;
                else timeStr = "פחות מדקה";

                return (
                  <span className="flex flex-col text-right leading-tight">
                    <span className="font-semibold text-gray-900">
                      🎟️ קרדיט: {credits}
                      <span className="text-xs text-blue-600 ml-1">
                        {balanceLabel()}
                      </span>
                    </span>

                    <span className="text-[11px] text-gray-600 mt-0.5">
                      יתרה זו מספיקה לתמלול מדיה באורך משוער של {timeStr}
                    </span>
                  </span>
                );
              })()}
            </div>
          </div>

          {showMenu && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-2 text-right animate-fade">

              <div className="px-3 py-2 text-xs text-gray-500 border-b truncate">
                {userEmail}
              </div>

              {groupInfo?.type === "group" && (
                <div className="px-3 py-2 text-sm text-blue-600 border-b">
                  מנוהל ע"י: {groupInfo.ownerEmail}
                </div>
              )}

              {/* 🔧 הגדרות */}
              <button
                className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-800"
                onClick={() => {
                  setView("token");
                  setShowMenu(false);
                }}
              >
                ⚙️ ניהול טוקן
              </button>

              {groupInfo?.type === "personal" && (
                <button
                  className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-800"
                  onClick={() => {
                    setView("group");
                    setShowMenu(false);
                  }}
                >
                  🫂 ניהול קבוצה
                </button>
              )}

              {groupInfo?.type === "group" && (
                <button
                  className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-red-600"
                  onClick={async () => {
                    await leaveGroup(userEmail);
                    window.location.reload();
                  }}
                >
                  🚪 עזוב קבוצה
                </button>
              )}

              <hr className="my-2 border-gray-200" />


              <button
                className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-800"
                onClick={() => {
                  window.open(
                    "https://docs.google.com/forms/d/e/1FAIpQLSeFKwyj-dy-kSv7mmdVPUFnyLuRgBbyFp_YYkhii5tI4XGCSg/viewform",
                    "_blank"
                  );
                  setShowMenu(false);
                }}
              >
                ✉️ שליחת משוב
              </button>

              <hr className="my-2 border-gray-200" />


              {/* ℹ️ אודות */}
              <button
                className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-800"
                onClick={() => {
                  setView("about");
                  setShowMenu(false);
                }}
              >
                ℹ️ אודות
              </button>

              <hr className="my-2 border-gray-200" />

              {/* 🚪 התנתקות */}
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

      {/* BODY בהתאם ל-view */}
      {view === "dashboard" ? (
        <div className="w-full max-w-5xl text-center">

          <div className="flex justify-center gap-4 mb-8 mt-4">
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

            <button
              onClick={() => window.dispatchEvent(new Event("logout"))}
              className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded-lg"
            >
              🔓 התנתק
            </button>
          </div>

          <TranscriptionsList
            userEmail={userEmail}
            tokenEmail={tokenEmail}
            onOpenTranscription={(record) => {
              setSelectedTranscription(record);
              setView(record?.transcript_id ? "player" : "upload");
            }}
          />
        </div>
      ) : view === "upload" ? (
        <UploadBox
          userEmail={userEmail}
          tokenEmail={tokenEmail}
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
          <button
            onClick={() => setView("dashboard")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg mb-6"
          >
            ⬅️ חזרה למסך הראשי
          </button>

          <TokenSetup
            userEmail={tokenEmail}
            onTokenSaved={() => {
              setHasToken(true);
              fetchBalance();
              setView("dashboard");
            }}
          />
        </div>
      ) : view === "group" ? (
        <div className="w-full max-w-5xl text-center mt-6">
          <button
            onClick={() => setView("dashboard")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg mb-6"
          >
            ⬅️ חזרה למסך הראשי
          </button>

          <GroupManager ownerEmail={userEmail} />
        </div>
      ) : view === "about" ? (
        <div className="w-full max-w-5xl text-center mt-6">
          <button
            onClick={() => setView("dashboard")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg mb-6"
          >
            ⬅️ חזרה למסך הראשי
          </button>

          <About />
        </div>
      ) : null}
    </div>
  );
}
