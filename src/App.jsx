import React, { useEffect, useState } from "react";
import UploadBox from "./components/upload/UploadBox";
import TokenSetup from "./components/account/TokenSetup";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [checked, setChecked] = useState(false);

  // בהמשך נחליף את זה במייל האמיתי מה-Login עם Google
  const userEmail = "nitzantry2@gmail.com";

  // בדיקה אם כבר יש טוקן שמור ב-Supabase
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data, error } = await supabase
          .from("accounts")
          .select("runpod_token_encrypted")
          .eq("owner_email", userEmail)
          .maybeSingle();

        if (data?.runpod_token_encrypted) {
          setHasToken(true);
        }
      } catch (err) {
        console.error("שגיאה בבדיקת טוקן:", err.message);
      } finally {
        setChecked(true);
      }
    };

    checkToken();
  }, []);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ טוען...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-gray-50">
      <h1 className="text-4xl font-bold mb-4">🎧 Tamleli Pro</h1>

      {!hasToken ? (
        <TokenSetup userEmail={userEmail} onTokenSaved={() => setHasToken(true)} />

      ) : (
        <div className="w-full max-w-6xl">
          <UploadBox />
        </div>
      )}
    </div>
  );
}
