// 📄 src/main.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

// 🆕 ניהול קבוצות — יבוא
import { getGroupForMember } from "./lib/groupManager";

const GOOGLE_CLIENT_ID =
  "842278999727-vqn91h47phqopgh0hv3ernm7s2e6jbri.apps.googleusercontent.com";

function Root() {
  const [user, setUser] = useState(null);

  // 🆕 מצב קבוצה
  const [groupInfo, setGroupInfo] = useState(null);

  // 🆕 האם המידע על הקבוצה נטען?
  const [groupLoaded, setGroupLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("googleAccessToken");
    const email = localStorage.getItem("googleUserEmail");

    // אין התחברות? אין טעם לבדוק קבוצה
    if (!token || !email) return;

    // עדכון משתמש
    setUser({ token, email });

    // 🆕 שליפת מידע על קבוצה לפני רינדור ה-App
    getGroupForMember(email).then((group) => {
      if (group) {
        console.log("👥 המשתמש שייך לקבוצה של:", group.owner_email);
        setGroupInfo({
          type: "group",
          ownerEmail: group.owner_email,
        });
      } else {
        console.log("👤 המשתמש במצב אישי / אורח");
        setGroupInfo({
          type: "personal",
        });
      }

      // 🆕 חשוב! רק עכשיו נסמן ש-groupInfo מוכן
      setGroupLoaded(true);
    });

    // 🧹 מנגנון התנתקות
    const handleLogout = () => {
      console.log("🔒 Logout – מנקה את כל ה-localStorage");

      localStorage.clear(); // מנקה הכל
      setUser(null);
      setGroupInfo(null);
      setGroupLoaded(false);

      window.location.href = "/";
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // 🟡 אם יש user אבל groupInfo עדיין לא נטען → ממתינים
  if (user && !groupLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        ⏳ טוען נתוני קבוצה...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-10 bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
          🎧 Tamleli Pro
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          המערכת לתמלול וזיהוי דוברים בעברית
        </p>

        {user ? (
          // 🆕 מעבירים אל האפליקציה גם user וגם groupInfo
          <App user={user} groupInfo={groupInfo} />
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg"
          >
            🔑 התחבר עם Google
          </button>
        )}
      </div>
    </div>
  );

  function handleGoogleLogin() {
    /* eslint-disable no-undef */
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope:
        "https://www.googleapis.com/auth/drive.file openid email profile",
      callback: async (tokenResponse) => {
        console.log("✅ קיבלנו access_token:", tokenResponse.access_token);
        localStorage.setItem("googleAccessToken", tokenResponse.access_token);

        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );
        const profile = await res.json();
        console.log("👤 משתמש מחובר:", profile.email);

        localStorage.setItem("googleUserEmail", profile.email);

        window.location.reload();
      },
    });
    client.requestAccessToken();
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Root />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
