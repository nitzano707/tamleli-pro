// 📄 src/components/upload/UploadBox.jsx
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


export default function UploadBox({
  userEmail = "User",
  onBackToDashboard,
  existingRecord = null,
  selectedTranscription,
  setSelectedTranscription, // ✅ חדש
  effBalance, // ← ✨ חדש ומאוד חשוב
}) {
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
  const [perfData, setPerfData] = useState(null);
  

  // מזהים יציבים בין רינדורים
  const audioIdRef = useRef(null);
  const mediaTypeRef = useRef("audio");
  


  // ✅ דגל שמירה – מונע שמירה כפולה ל-Drive (StrictMode / רינדורים כפולים)
  const hasSavedInitialTranscript = useRef(false);

  // ✅ טעינת קובץ קיים מהדרייב
  useEffect(() => {
    const loadExisting = async () => {
      if (!existingRecord) return;

      console.log("📦 טוען קובץ קיים מהדרייב:", existingRecord);
      setAlias(existingRecord.alias || "");
      setDriveFolderId(existingRecord.folder_id || null);
      setRecordId(existingRecord.id || null);
      setStatus("🎵 קובץ נטען מהדרייב. מוכן לשליחה לתמלול.");

      const accessToken = localStorage.getItem("googleAccessToken");

      // ⭐ זיהוי סוג המדיה
      if (existingRecord.media_type)
        mediaTypeRef.current = existingRecord.media_type;

      // ⭐ יש קובץ אודיו/וידאו בדרייב
      if (existingRecord.audio_id) {
        const driveUrl = `https://drive.google.com/uc?export=download&id=${existingRecord.audio_id}`;

        // ⭐ אם זה וידאו — אפשר לנגן מהדרייב ישירות
        if (mediaTypeRef.current === "video") {
          setAudioUrl(driveUrl);
          setUploadedUrl(driveUrl);
        } else {
          // ⭐ אם זה אודיו — חובה להביא URL תקין מה-proxy
          try {
            const res = await fetch(
              `${BASE_URL}/fetch-and-store-audio?file_id=${existingRecord.audio_id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const data = await res.json();
            if (data.url) {
              setAudioUrl(data.url);
              setUploadedUrl(data.url);
            } else {
              console.warn("⚠️ fetch-and-store-audio לא החזיר URL");
            }
          } catch (err) {
            console.error("❌ שגיאה בקבלת URL מה-proxy:", err);
          }
        }

        audioIdRef.current = existingRecord.audio_id;
      }

      // ⭐⭐ המשך תמלול קיים אם יש job_id אבל אין transcript_id ⭐⭐
      if (existingRecord.job_id && !existingRecord.transcript_id) {
        console.log("🔄 ממשיך תמלול למזהה העבודה:", existingRecord.job_id);

        hasSavedInitialTranscript.current = false; // נוודא שמותר לשמור תמלול עבור ה-Job הזה
        setJobId(existingRecord.job_id);
        setIsTranscribing(true);
        setStatus("📤 ממשיך מעקב אחרי התמלול...");
        setProgress(30);
      }
    };

    loadExisting();
  }, [existingRecord]);

  // ⚙️ בחירת קובץ
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f)
      mediaTypeRef.current = f.type.startsWith("video") ? "video" : "audio";
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

    // 🎵 חישוב אורך האודיו/וידאו (לשימוש עתידי – החישובים עוברים לשרת)
    let audioLengthSeconds = null;

    if (!file) {
      audioLengthSeconds = null;
    } else if (
      mediaTypeRef.current === "audio" ||
      mediaTypeRef.current === "video"
    ) {
      const sourceUrl = URL.createObjectURL(file);

      const mediaEl =
        mediaTypeRef.current === "audio"
          ? new Audio(sourceUrl)
          : Object.assign(document.createElement("video"), { src: sourceUrl });

      audioLengthSeconds = await new Promise((resolve) => {
        mediaEl.onloadedmetadata = () => resolve(mediaEl.duration);
        mediaEl.onerror = () => resolve(null);
      });
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
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
        const sub = await createSubFolder(
          accessToken,
          mainFolderId,
          alias || file.name
        );
        setDriveFolderId(sub.id);

        const audioId = await uploadFileToFolder(
          accessToken,
          sub.id,
          file,
          file.type
        );
        audioIdRef.current = audioId;
        const mediaType = mediaTypeRef.current;

        const row = await createTranscription(
          userEmail,
          alias || file.name,
          sub.id,
          audioId,
          mediaType
        );

        if (row?.id) {
          setRecordId(row.id);
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
        // ⭐⭐ כאן בדיוק להוסיף ⭐⭐
        await fetch(`${BASE_URL}/db/transcriptions/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: row.id,
            updates: {
              file_size_bytes: file.size,   // ← המידע שחסר אצלך ב-DB
            },
          }),
        });
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

  // ⚡ שמירה אוטומטית ראשונית בדרייב לאחר תמלול
  const saveInitialTranscriptToDrive = async (segmentsData, jobIdParam) => {
    try {
      // 🔒 הגנה מפני שמירה כפולה (StrictMode / רינדורים חוזרים)
      if (hasSavedInitialTranscript.current) {
        console.log(
          "ℹ️ תמלול כבר נשמר בדרייב עבור ה-Job הזה – דילוג על שמירה נוספת."
        );
        return;
      }
      hasSavedInitialTranscript.current = true;

      const accessToken = localStorage.getItem("googleAccessToken");
      if (!accessToken) {
        console.warn("⚠️ אין גישה ל-Google Drive");
        return;
      }

      if (!segmentsData || !segmentsData.length) {
        console.warn("⚠️ אין Segments לשמירה בדרייב.");
        return;
      }

      if (!jobIdParam) {
        console.warn(
          "⚠️ jobId לא התקבל מתוצאת הסטטוס — ממשיך לשמור תמלול בלי לשמור job_id."
        );
      }

      const mediaType = mediaTypeRef.current;

      // 📝 בניית JSON לשמירה
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

      // 🏷 שם קובץ
      const transcriptName = `${(alias || file?.name || "Transcription")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w\u0590-\u05FF]+/g, "_")}_transcript_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.json`;

      // 📂 תיקייה – תמיד נעדיף את תת-התקייה הייעודית, אם קיימת
      const folderId =
        driveFolderId || (await findOrCreateMainFolder(accessToken));

      // 📤 שמירה ל-דרייב
      const transcriptId = await uploadTranscriptToDrive(
        accessToken,
        folderId,
        transcriptName,
        transcriptJson,
        "application/json"
      );

      // 🟦 חיפוש recordId לשמירת transcript_id
      let effectiveRecordId = recordId;
      if (!effectiveRecordId) {
        const last = JSON.parse(
          localStorage.getItem("lastTranscriptionRecord") || "{}"
        );
        effectiveRecordId = last.recordId || null;
      }

      // ⭐ עדכון ה־transcript_id במסד ⭐
      if (effectiveRecordId && transcriptId) {
        try {
          await updateTranscriptId(effectiveRecordId, transcriptId);

          if (setSelectedTranscription) {
            setSelectedTranscription((prev) => ({
              ...prev,
              transcript_id: transcriptId,
            }));
          }

          console.log("✅ עודכן transcript_id במסד Supabase:", transcriptId);
        } catch (dbErr) {
          console.error("⚠️ עדכון transcript_id נכשל:", dbErr);
        }
      }

      // 🟢 שמירה ב-localStorage
      localStorage.setItem("currentTranscriptId", transcriptId);

      console.log("📁 תמלול נשמר אוטומטית בדרייב:", transcriptId);
    } catch (err) {
      console.error("❌ שגיאה בשמירה האוטומטית בדרייב:", err);
    }
  };

  // 🎧 התחלת תמלול
  const handleTranscribe = async () => {
    hasSavedInitialTranscript.current = false;

    setIsTranscribing(true);
    setStatus("📤 שולח בקשה לתמלול...");
    setProgress(10);

    // בכל התחלה של Job חדש – נאפשר שמירה מחדש
    hasSavedInitialTranscript.current = false;

    try {
      let fileUrl = "";
      const accessToken = localStorage.getItem("googleAccessToken");

      if (uploadedUrl && uploadedUrl.includes(BASE_URL)) {
        fileUrl = uploadedUrl;
        console.log("🎧 מצב 1 – קובץ חדש מה-Proxy:", fileUrl);
      } else if (audioIdRef.current) {
        console.log("🎧 מצב 2 – קובץ שמור מדרייב → fetch-and-store-audio...");

        const res = await fetch(
          `${BASE_URL}/fetch-and-store-audio?file_id=${audioIdRef.current}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const data = await res.json();
        if (!res.ok || !data.url)
          throw new Error(data.error || "שגיאה בשליפת קובץ מדרייב");

        fileUrl = data.url;
        console.log("✅ קובץ מדרייב נשמר זמנית בשרת ונשלח ל-RunPod:", fileUrl);
        setAudioUrl(fileUrl);
      }

      if (!fileUrl) throw new Error("❌ לא נמצא קובץ לשליחה לתמלול.");

      const rpRes = await fetch(RUNPOD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          file_url: fileUrl,
          input: {
            engine: "stable-whisper",
            model: "ivrit-ai/whisper-large-v3-turbo-ct2",
            transcribe_args: {
              url: fileUrl,
              language: "he",
              diarize: true,
              vad: true,
              word_timestamps: true,
            },
          },
        }),
      });

      const rpData = await rpRes.json();
      console.log("📦 תגובת RunPod:", rpData);

      // ⭐⭐⭐ שלב חובה — נשמור job_id מיד כשקיבלנו אותו ⭐⭐⭐
      if (rpData?.id && audioIdRef.current) {
        try {
          await fetch(`${BASE_URL}/db/transcriptions/update-job`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio_id: audioIdRef.current,
              job_id: rpData.id,
            }),
          });

          console.log(
            "🔥 job_id נשמר מיד עבור audio_id:",
            audioIdRef.current
          );
        } catch (err) {
          console.warn("⚠️ שמירת job_id נכשלה:", err);
        }
      }

      if (rpData?.id) {
        setJobId(rpData.id);
        setStatus("🕓 בתור לעיבוד...");
        setProgress(30);
      } else {
        throw new Error(rpData.error || "לא התקבל מזהה משימה מ-RunPod");
      }
    } catch (err) {
      console.error("❌ שגיאה בתהליך התמלול:", err);
      setStatus(`❌ שגיאה: ${err.message}`);
      setIsTranscribing(false);
    }
  };

  // 🔁 Polling סטטוס רנפוד
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${RUNPOD_STATUS_BASE}/${jobId}?user_email=${encodeURIComponent(
            userEmail
          )}`
        );

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
              const normalized = normalizeRunpodOutput(data.output);
              segs = mergeConsecutiveBySpeaker(normalized);
              setSegments(segs);
              console.log("✅ Segments normalized:", segs);

              // ✅ שמירת התמלול בדרייב + שימוש ב־jobId מה־state
              await saveInitialTranscriptToDrive(segs, jobId);
              if (hasSavedInitialTranscript.current) {
                  console.log("ℹ️ תמלול כבר נשמר – דילוג");
                  return;
              }
              hasSavedInitialTranscript.current = true;


              // ⭐ השהיה קצרה כדי לאפשר ל־/status בצד השרת להשלים עדכון DB ⭐
              await new Promise((resolve) => setTimeout(resolve, 750));

              // 🔄 שליפת הרשומה המעודכנת מה-DB כדי לקבל נתוני ביצועים
              try {
                let effectiveRecordId = recordId;
                if (!effectiveRecordId) {
                  const last = JSON.parse(
                    localStorage.getItem("lastTranscriptionRecord") || "{}"
                  );
                  effectiveRecordId = last.recordId || null;
                }

                if (effectiveRecordId) {
                  const recordRes = await fetch(
                    `${BASE_URL}/db/transcriptions/get?id=${effectiveRecordId}`
                  );

                  if (recordRes.ok) {
                    const recordData = await recordRes.json();

                    setPerfData({
                      actual_processing_seconds:
                        recordData.actual_processing_seconds,
                      billing_usd: recordData.billing_usd,
                      processing_ratio: recordData.processing_ratio,
                      worker_boot_time_seconds:
                        recordData.worker_boot_time_seconds,
                      job_id: recordData.job_id,
                    });

                    console.log("📊 נתוני ביצועים מה-DB:", recordData);
                  }
                }
              } catch (dbErr) {
                console.warn(
                  "⚠️ לא הצלחנו לשלוף נתוני ביצועים מה-DB:",
                  dbErr
                );
              }

              try {
                await fetch(
                  `${BASE_URL}/effective-balance?user_email=${encodeURIComponent(
                    userEmail
                  )}`
                );
                console.log("💰 יתרה עודכנה אוטומטית לאחר סיום תמלול");
                window.dispatchEvent(new Event("refreshBalance"));
              } catch (balanceErr) {
                console.warn("⚠️ לא הצלחנו לרענן יתרה:", balanceErr);
              }
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
  }, [jobId, userEmail, recordId]);

  // 🎨 ממשק
  return (
    <div className="flex flex-col items-center w-full">
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

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-5xl border-2 border-dashed border-gray-400 rounded-3xl p-10 text-center bg-white hover:bg-gray-50 transition-all duration-300 shadow-sm sm:p-8 md:p-10"
      >
        <h2 className="text-xl font-semibold mb-3">
          העלה קובץ אודיו או וידאו
        </h2>
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          id="audioInput"
          style={{ display: "none" }}
        />
        <label
          htmlFor="audioInput"
          className="cursor-pointer text-blue-600 underline"
        >
          בחר קובץ מהמחשב
        </label>
        {file && <p className="mt-3 text_GRAY-700">{file.name}</p>}

        <div className="mt-4">
          <label className="block text-gray-700 font-medium mb-1">
            שם תמלול (אליאס):
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="למשל: ראיון עם פלוני אלמוני"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md text-center focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        {!isUploading && !existingRecord ? (
          <>
            <Button
              onClick={handleUpload}
              className="mt-4"
              disabled={!file || effBalance <= 0}
              title={
                effBalance <= 0
                  ? "אין יתרה זמינה — לא ניתן להעלות קובץ חדש"
                  : ""
              }
            >
              העלה
            </Button>

            {effBalance <= 0 && (
              <div className="mt-2 text-red-600 text-sm">
                ⚠️ אין יתרה זמינה להעלאת קבצים.
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("openTokenSetup"))
                  }
                  className="text-blue-700 underline ml-1"
                >
                  הזן טוקן →
                </button>
              </div>
            )}
          </>
        ) : existingRecord ? (
          <p className="mt-4 text-gray-600">
            ✅ קובץ זה כבר נשמר בדרייב. ניתן כעת לתמלל אותו.
          </p>
        ) : (
          <p className="mt-4 text-gray-600">מעלה קובץ...</p>
        )}

        {uploadedUrl && (
          <>
            <div className="mt-6 text-sm text-green-700 break-all">
              <p>✅ קובץ מוכן לתמלול:</p>
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
              disabled={
                isTranscribing || segments.length > 0 || effBalance <= 0
              }
              title={
                effBalance <= 0
                  ? "אין יתרה זמינה — לא ניתן לבצע תמלול"
                  : ""
              }
            >
              תמלל קובץ זה
            </Button>

            {effBalance <= 0 && (
              <div className="mt-2 text-red-600 text-sm">
                ⚠️ אין יתרה זמינה לתמלול.
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("openTokenSetup"))
                  }
                  className="text-blue-700 underline ml-1"
                >
                  הזן טוקן →
                </button>
              </div>
            )}
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
