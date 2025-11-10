import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import UploadBox from "./components/upload/UploadBox";
import { GoogleOAuthProvider } from "@react-oauth/google";

// ✅ הוסף כאן את ה־Client ID שלך מגוגל
const GOOGLE_CLIENT_ID = "842278999727-vqn91h47phqopgh0hv3ernm7s2e6jbri.apps.googleusercontent.com";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start gap-10 text-center p-10 bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-8">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-2 mb-2">
          🎧 Tamleli Pro
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          המערכת לתמלול וזיהוי דוברים בעברית
        </p>

        <UploadBox />
      </div>
    </div>
  );
}

// ✅ עטיפת כל האפליקציה ב־GoogleOAuthProvider
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
