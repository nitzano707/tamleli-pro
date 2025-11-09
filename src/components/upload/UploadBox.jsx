import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import TranscriptPlayer from "../player/TranscriptPlayer";

const BASE_URL = "https://my-transcribe-proxy.onrender.com";
const RUNPOD_URL = `${BASE_URL}/transcribe`;
const RUNPOD_STATUS_BASE = `${BASE_URL}/status`;

export default function UploadBox() {
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState("");
  const [segments, setSegments] = useState([]);
  const [audioUrl, setAudioUrl] = useState("");

  const handleFileSelect = (e) => setFile(e.target.files?.[0] || null);
  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  // 📤 העלאת קובץ
  const handleUpload = async () => {
    if (!file) return alert("בחר קובץ קודם");
    setIsUploading(true);
    setStatus("מעלה קובץ...");
    setProgress(20);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("שגיאה בהעלאה");
      const data = await res.json();
      setUploadedUrl(data.url);
      setAudioUrl(data.url);
      setStatus("✅ הקובץ הועלה בהצלחה!");
      setProgress(100);
      setSegments([]); // אפס תמלול קודם
    } catch (err) {
      console.error(err);
      setStatus("❌ שגיאה בהעלאה");
    } finally {
      setIsUploading(false);
    }
  };

  // 🎧 התחלת תמלול
  const handleTranscribe = async () => {
    if (!uploadedUrl) return alert("קודם העלה קובץ");
    setIsTranscribing(true);
    setStatus("📤 שולח בקשה לשרת...");
    setProgress(10);

    try {
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
      setStatus("❌ שגיאה בשליחת הבקשה");
      setIsTranscribing(false);
    }
  };

  // 🔁 בדיקת סטטוס
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

            let segments = [];
            try {
              if (data.output?.transcription?.segments) {
                segments = data.output.transcription.segments;
              } else if (data.output?.segments) {
                segments = data.output.segments;
              } else if (Array.isArray(data.output) && data.output[0]?.result) {
                const nested = data.output[0].result.flat();
                segments = nested.map((seg) => ({
                  speaker: seg.speakers?.[0] || "דובר",
                  text: seg.text || "",
                  start: seg.start,
                  end: seg.end,
                }));
              } else {
                segments = [{ speaker: "דובר", text: data.output?.text || "❌ לא התקבל טקסט תקין" }];
              }
            } catch (err) {
              console.error("⚠️ שגיאה בפענוח הנתונים:", err);
              segments = [{ speaker: "דובר", text: "⚠️ שגיאה בפענוח הנתונים" }];
            }

            if (segments.length > 0) setSegments(mergeSpeakers(segments));
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

  // 🧠 מיזוג דוברים
  const mergeSpeakers = (segments) => {
    const merged = [];
    if (!segments || !segments.length) return merged;
    let current = { ...segments[0] };
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].speaker === current.speaker) {
        current.text += " " + segments[i].text;
        current.end = segments[i].end;
      } else {
        merged.push(current);
        current = { ...segments[i] };
      }
    }
    merged.push(current);
    return merged;
  };

  // 📄 הורדות רגילות
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format) => {
    if (!segments.length) return;
    let content = "";
    if (format === "txt") {
      content = segments.map((s) => `${s.speaker}:\n${s.text.trim()}\n`).join("\n");
      downloadFile(content, "transcript.txt", "text/plain");
    } else if (format === "json") {
      content = JSON.stringify(segments, null, 2);
      downloadFile(content, "transcript.json", "application/json");
    } else if (format === "csv") {
      content =
        "Speaker,Text\n" +
        segments
          .map((s) => `"${s.speaker}","${s.text.replace(/"/g, '""').trim()}"`)
          .join("\n");
      downloadFile(content, "transcript.csv", "text/csv");
    } else if (format === "srt") {
      content = segments
        .map((s, i) => `${i + 1}\n${s.speaker}: ${s.text.trim()}\n`)
        .join("\n\n");
      downloadFile(content, "transcript.srt", "text/plain");
    }
  };

  const handleCopy = () => {
    const text = segments.map((s) => `${s.speaker}:\n${s.text.trim()}\n`).join("\n");
    navigator.clipboard.writeText(text);
    alert("📋 התמלול הועתק ללוח!");
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* שלב ההעלאה */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-5xl border-2 border-dashed border-gray-400 rounded-3xl p-10 text-center bg-white hover:bg-gray-50 transition-all duration-300 shadow-sm sm:p-8 md:p-10"
      >
        <h2 className="text-xl font-semibold mb-3">העלה קובץ אודיו</h2>

        <input type="file" accept="audio/*" onChange={handleFileSelect} id="audioInput" style={{ display: "none" }} />
        <label htmlFor="audioInput" className="cursor-pointer text-blue-600 underline">
          בחר קובץ מהמחשב
        </label>

        {file && <p className="mt-3 text-gray-700">{file.name}</p>}

        {!isUploading ? (
  <Button
    onClick={handleUpload}
    className="mt-4"
    disabled={!!uploadedUrl || !file}
  >
    העלה
  </Button>
) : (
  <p className="mt-4 text-gray-600">מעלה קובץ...</p>
)}


        {uploadedUrl && (
          <>
            <div className="mt-6 text-sm text-green-700 break-all">
              <p>✅ קובץ הועלה:</p>
              <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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
          <div className="mt-4 p-3 text-sm bg-gray-100 border rounded-md">
            {status}
            {isTranscribing && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* שלב התמלול */}
      {segments.length > 0 && (
        <div className="mt-10 w-full max-w-6xl mx-auto text-right">
          <p className="text-sm text-gray-500 mb-2 text-center">
            💡 ניתן ללחוץ על משפט כדי לדלג בנגן, ללחוץ פעמיים על שם דובר כדי לעדכן אותו, וללחוץ על מילים כדי לתקן אותן.
          </p>
          <TranscriptPlayer transcriptData={segments} audioUrl={audioUrl} onDownload={handleDownload} onCopy={handleCopy} />
        </div>
      )}
    </div>
  );
}
