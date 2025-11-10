// 📄 src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// ✅ Client ID שלך מגוגל (השאר בדיוק כמו שהיה)
const GOOGLE_CLIENT_ID =
  "842278999727-vqn91h47phqopgh0hv3ernm7s2e6jbri.apps.googleusercontent.com";

// ✅ עטיפת כל האפליקציה ב־GoogleOAuthProvider
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
