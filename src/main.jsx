// 📄 src/main.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID =
  "842278999727-vqn91h47phqopgh0hv3ernm7s2e6jbri.apps.googleusercontent.com";

function Root() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("googleAccessToken");
    const email = localStorage.getItem("googleUserEmail");
    if (token && email) setUser({ token, email });

    const handleLogout = () => {
      localStorage.removeItem("googleAccessToken");
      localStorage.removeItem("googleUserEmail");
      setUser(null);
    };
    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // 🔑 התחברות לגוגל
  const handleGoogleLogin = () => {
    /* eslint-disable no-undef */
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file openid email profile",
      callback: async (tokenResponse) => {
        console.log("✅ קיבלנו access_token:", tokenResponse.access_token);
        localStorage.setItem("googleAccessToken", tokenResponse.access_token);

        // 🔹 נקבל גם את האימייל של המשתמש
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        console.log("👤 משתמש מחובר:", profile.email);
        localStorage.setItem("googleUserEmail", profile.email);

        window.location.reload();
      },
    });
    client.requestAccessToken();
  };

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
          <App />
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
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Root />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
