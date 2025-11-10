import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import TranscriptPlayer from "../player/TranscriptPlayer";

// 🧩 מודולים לדרייב ולמסד נתונים
import {
  findOrCreateMainFolder,
  createSubFolder,
  uploadFileToFolder,
  uploadTranscriptToDrive,
} from "../../lib/googleDriveUtils";
import {
  createTranscription,
  updateTranscriptId,
} from "../../lib/dbTranscriptions";

// 🧠 מודול נורמליזציה
import {
  normalizeRunpodOutput,
  mergeConsecutiveBySpeaker,
} from "../../lib/transcriptNormalizer";

const BASE_URL = "https://my-transcribe-proxy.onrender.com";
const RUNPOD_URL = `${BASE_URL}/transcribe`;
const RUNPOD_STATUS_BASE = `${BASE_URL}/status`;

export default function UploadBox({ userEmail = "User", onBackToDashboard }) {
  const [file, setFile] = useState(null);
  const [alias, setAlias] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState("");
  const [segments, setSegments] = useState([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [driveFolderId, setDriveFolderId] = useState(null);

  // מזהים יציבים בין רינדורים
  const audioIdRef = useRef(null);          // מזהה קובץ המדיה בדרייב
  const mediaTypeRef = useRef("audio");     // "audio" | "video" לפי הקובץ שנבחר

  // ⚙️ בחירת או גרירת קובץ
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) mediaTypeRef.current = f.type.startsWith("video") ? "video" : "audio";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] || null;
    if (f) {
      setFile(f);
      mediaTypeRef.current = f.type.startsWith("video") ? "video" : "audio";
    }
  };

  // 🔐 התנתקות מגוגל
  const handleLogout = () => {
    localStorage.removeItem("googleAccessToken");
    alert("נותקת מחשבון Google. מתחבר מחדש...");
    window.location.href = "/";
  };

  // 📤 העלאה לפרוקסי ולדרייב
  const handleUpload = async () => {
    if (!file) return alert("בחר קובץ קודם");
    setIsUploading(true);
    setStatus("מעלה קובץ ל־Proxy...");
    setProgress(20);

    // 1️⃣ העלאה לפרוקסי
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("שגיאה בהעלאה ל-Proxy");
      const data = await res.json();
      const proxyUrl = data.url || data.fileUrl;

      setUploadedUrl(proxyUrl);
      setAudioUrl(proxyUrl);
      setStatus("✅ הקובץ הועלה ל־Proxy בהצלחה");
      setProgress(60);
    } catch (err) {
      console.error(err);
      setStatus("❌ שגיאה בהעלאה ל־Proxy");
      setIsUploading(false);
      return;
    }

    // 2️⃣ ארכוב לדרייב + יצירת רשומה ב־DB
    try {
      const accessToken = localStorage.getItem("googleAccessToken");
      if (accessToken) {
        const mainFolderId = await findOrCreateMainFolder(accessToken);
        const sub = await createSubFolder(accessToken, mainFolderId, alias || file.name);
        setDriveFolderId(sub.id);

        const audioId = await uploadFileToFolder(accessToken, sub.id, file, file.type);
        audioIdRef.current = audioId;

        // סוג מדיה מחושב פעם אחת ושמור ב-ref
        const mediaType = mediaTypeRef.current;

        // 🟢 יצירת רשומה במסד (כולל סוג מדיה)
        const row = await createTranscription(
          userEmail,
          alias || file.name,
          sub.id,
          audioId,
          mediaType
        );

        if (row?.id) {
          setRecordId(row.id);
          // שמירה מקומית לשימוש מאוחר יותר (למקרה שה־state עדיין לא עדכני בזמן שמירת התמלול)
          localStorage.setItem(
            "lastTranscriptionRecord",
            JSON.stringify({
              recordId: row.id,
              audioId,
              folderId: sub.id,
              alias,
              type: mediaType,
            })
          );
        }

        setStatus("✅ הקובץ נשמר בדרייב ונרשם במערכת");
      } else {
        setStatus((s) => s + " (דלג על Drive — אין התחברות ל-Google)");
      }
      setProgress(100);
    } catch (err) {
      console.error("שגיאה בארכוב ל-Drive או במסד:", err);
      setStatus("⚠️ העלאה לפרוקסי הצליחה אך הארכוב ל-Drive נכשל");
    } finally {
      setIsUploading(false);
    }
  };

  // ⚡ שמירה אוטומטית ראשונית בדרייב לאחר השלמת תמלול
  const saveInitialTranscriptToDrive = async (segmentsData) => {
    try {
      const accessToken = localStorage.getItem("googleAccessToken");
      if (!accessToken) return console.warn("⚠️ אין גישה ל-Google Drive");

      const mediaType = mediaTypeRef.current;

      const transcriptJson = JSON.stringify(
        {
          app: "Tamleli Pro",
          schema_version: 1,
          exported_at: new Date().toISOString(),
          audioFileId: audioIdRef.current,
          mediaType,
          segments: segmentsData,
        },
        null,
        2
      );

      const transcriptName = `${(alias || file?.name || "Transcription")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w\u0590-\u05FF]+/g, "_")}_transcript_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.json`;

      const folderId = driveFolderId || (await findOrCreateMainFolder(accessToken));
      const transcriptId = await uploadTranscriptToDrive(
        accessToken,
        folderId,
        transcriptName,
        transcriptJson,
        "application/json"
      );

      // ודא שיש לנו recordId (מה-state או מה-LocalStorage)
      let effectiveRecordId = recordId;
      if (!effectiveRecordId) {
        const last = JSON.parse(localStorage.getItem("lastTranscriptionRecord") || "{}");
        effectiveRecordId = last.recordId || null;
      }

      // עדכון ה־DB
      if (effectiveRecordId && transcriptId) {
        try {
          await updateTranscriptId(effectiveRecordId, transcriptId);
          console.log("✅ עודכן transcript_id במסד Supabase:", transcriptId);
        } catch (dbErr) {
          console.error("⚠️ עדכון transcript_id נכשל:", dbErr);
        }
      } else {
        console.warn("⚠️ חסרים מזהים לעדכון מסד הנתונים:", { effectiveRecordId, transcriptId });
      }

      // שמירה מקומית
      localStorage.setItem("currentTranscriptId", transcriptId);
      localStorage.setItem(
        "lastTranscriptionRecord",
        JSON.stringify({
          recordId: effectiveRecordId,
          transcriptId,
          audioId: audioIdRef.current,
          folderId: driveFolderId,
          alias,
          type: mediaType,
        })
      );

      console.log("✅ תמלול נשמר אוטומטית בדרייב:", transcriptId);
    } catch (err) {
      console.error("❌ שגיאה בשמירה האוטומטית בדרייב:", err);
    }
  };

  // 🎧 התחלת תמלול (שולחים את URL מה-Proxy)
  const handleTranscribe = async () => {
    if (!uploadedUrl) return alert("קודם העלה קובץ ל־Proxy");
    setIsTranscribing(true);
    setStatus("📤 שולח בקשה לתמלול...");
    setProgress(10);

    try {
      console.log("🎧 URL שנשלח ל-RunPod:", uploadedUrl);
      const res = await fetch(RUNPOD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            engine: "stable-whisper",
            model: "ivrit-ai/whisper-large-v3-turbo-ct2",
            transcribe_args: {
              url: uploadedUrl,
              language: "he",
              diarize: true,
              vad: true,
              word_timestamps: true,
            },
          },
        }),
      });

      const data = await res.json();
      if (data?.id) {
        setJobId(data.id);
        setStatus("🕓 בתור לעיבוד...");
        setProgress(30);
      } else {
        setStatus("⚠️ לא התקבל מזהה משימה");
        setIsTranscribing(false);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ שגיאה בשליחת הבקשה ל-RunPod");
      setIsTranscribing(false);
    }
  };

  // 🔁 Polling סטטוס רנפוד
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${RUNPOD_STATUS_BASE}/${jobId}`);
        if (!res.ok) throw new Error("שגיאה בבדיקת סטטוס");
        const data = await res.json();

        if (data?.status) {
          setStatus(`🔄 סטטוס: ${data.status}`);
          if (data.status === "IN_QUEUE") setProgress(40);
          if (data.status === "IN_PROGRESS") setProgress(70);

          if (data.status === "COMPLETED") {
            clearInterval(interval);
            setProgress(100);
            setIsTranscribing(false);
            setStatus("✅ התמלול הושלם!");

            let segs = [];
            try {
              // ✅ נרמול פלט רנפוד
              const normalized = normalizeRunpodOutput(data.output);
              segs = mergeConsecutiveBySpeaker(normalized);
              setSegments(segs);
              console.log("✅ Segments normalized:", segs);

              // ✅ שמירה אוטומטית ראשונית בדרייב
              await saveInitialTranscriptToDrive(segs);
            } catch (err) {
              console.error("⚠️ שגיאה בנורמליזציה:", err);
              segs = [{ speaker: "דובר", text: "⚠️ שגיאה בנורמליזציה" }];
              setSegments(segs);
            }
          }

          if (data.status === "FAILED") {
            clearInterval(interval);
            setIsTranscribing(false);
            setStatus("❌ העיבוד נכשל");
          }
        }
      } catch (err) {
        console.error("שגיאה בבדיקת סטטוס:", err);
        setStatus("⚠️ בעיה בחיבור לשרת");
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [jobId]);

  // 🎨 ממשק משתמש
  return (
    <div className="flex flex-col items-center w-full">
      {/* 🔘 כפתורי ניווט עליונים */}
      <div className="w-full flex justify-between max-w-5xl mb-4">
        <Button
          onClick={() => onBackToDashboard?.()}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg shadow-sm"
        >
          ⬅️ חזור לדשבורד
        </Button>

        <Button
          onClick={handleLogout}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg shadow-sm"
        >
          🔓 התנתק
        </Button>
      </div>

      {/* אזור העלאה */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-5xl border-2 border-dashed border-gray-400 rounded-3xl p-10 text-center bg-white hover:bg-gray-50 transition-all duration-300 shadow-sm sm:p-8 md:p-10"
      >
        <h2 className="text-xl font-semibold mb-3">העלה קובץ אודיו או וידאו</h2>

        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          id="audioInput"
          style={{ display: "none" }}
        />
        <label htmlFor="audioInput" className="cursor-pointer text-blue-600 underline">
          בחר קובץ מהמחשב
        </label>

        {file && <p className="mt-3 text-gray-700">{file.name}</p>}

        {/* אליאס */}
        <div className="mt-4">
          <label className="block text-gray-700 font-medium mb-1">שם תמלול (אליאס):</label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="למשל: ראיון עם פלוני אלמוני"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md text-center focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        {!isUploading ? (
          <Button onClick={handleUpload} className="mt-4" disabled={!!uploadedUrl || !file}>
            העלה
          </Button>
        ) : (
          <p className="mt-4 text-gray-600">מעלה קובץ...</p>
        )}

        {uploadedUrl && (
          <>
            <div className="mt-6 text-sm text-green-700 break-all">
              <p>✅ קובץ הועלה ל־Proxy:</p>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {uploadedUrl}
              </a>
            </div>

            <Button
              onClick={handleTranscribe}
              className="mt-4 bg-green-600 hover:bg-green-700"
              disabled={isTranscribing || segments.length > 0}
            >
              תמלל קובץ זה
            </Button>
          </>
        )}

        {status && (
          <div className="mt-4 p-3 text-sm bg-gray-100 border rounded-md text-right">
            {status}
            {(isTranscribing || isUploading) && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* נגן ותוצאות */}
      {segments.length > 0 && (
        <div className="mt-10 w-full max-w-6xl mx-auto text-right">
          <TranscriptPlayer
            transcriptData={segments}
            mediaUrl={audioUrl}
            mediaType={mediaTypeRef.current === "video" ? "video" : "audio"}
          />
        </div>
      )}
    </div>
  );
}
