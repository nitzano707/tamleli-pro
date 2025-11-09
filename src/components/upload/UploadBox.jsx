import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";

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
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("שגיאה בהעלאה");
      const data = await res.json();
      setUploadedUrl(data.url);
      setStatus("✅ הקובץ הועלה בהצלחה!");
      setProgress(100);
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
        headers: {
          "Content-Type": "application/json",
        },
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

  // 🔁 בדיקת סטטוס נכונה (GET /status/<id>)
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${RUNPOD_STATUS_BASE}/${jobId}`, {
          method: "GET",
        });

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

            console.log("🔍 תגובת שרת מלאה:", data);

            let segments = [];
            let text = "";

            try {
              if (data.output?.transcription?.segments) {
                segments = data.output.transcription.segments;
                text = data.output.transcription.text || "";
              } else if (data.output?.segments) {
                segments = data.output.segments;
                text = data.output.text || "";
              } else if (Array.isArray(data.output) && data.output[0]?.result) {
                const nested = data.output[0].result.flat();
                segments = nested.map((seg) => ({
                  speaker: seg.speakers?.[0] || "דובר",
                  text: seg.text || "",
                  start: seg.start,
                  end: seg.end,
                }));
                text = segments.map((s) => s.text).join(" ");
              } else {
                text =
                  data.output?.text ||
                  data.output?.transcription?.text ||
                  "❌ לא התקבל טקסט תקין";
                segments = [{ speaker: "דובר", text }];
              }
            } catch (err) {
              console.error("⚠️ שגיאה בפענוח הנתונים:", err);
              text = "⚠️ שגיאה בפענוח הנתונים";
              segments = [{ speaker: "דובר", text }];
            }

            console.log("📄 Segments שזוהו:", segments);
            console.log("🗣️ טקסט מאוחד:", text);

            if (segments.length > 0) {
              setSegments(mergeSpeakers(segments));
            } else {
              setSegments([{ speaker: "דובר", text }]);
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

  // 🧠 מיזוג דוברים
  const mergeSpeakers = (segments) => {
    const merged = [];
    if (!segments || segments.length === 0) return merged;

    let current = { speaker: segments[0].speaker, text: segments[0].text };
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].speaker === current.speaker) {
        current.text += " " + segments[i].text;
      } else {
        merged.push(current);
        current = { speaker: segments[i].speaker, text: segments[i].text };
      }
    }
    merged.push(current);
    return merged;
  };

  // 📄 הורדות
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
      content = segments
        .map((s) => `${s.speaker || "דובר"}:\n${s.text.trim()}\n`)
        .join("\n");
      downloadFile(content, "transcript.txt", "text/plain");
    } else if (format === "json") {
      content = JSON.stringify(segments, null, 2);
      downloadFile(content, "transcript.json", "application/json");
    } else if (format === "csv") {
      content =
        "Speaker,Text\n" +
        segments
          .map(
            (s) =>
              `"${s.speaker || "דובר"}","${s.text
                .replace(/"/g, '""')
                .trim()}"`
          )
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
    const text = segments
      .map((s) => `${s.speaker || "דובר"}:\n${s.text.trim()}\n`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("📋 התמלול הועתק ללוח!");
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-400 rounded-2xl p-10 text-center bg-gray-50 hover:bg-gray-100 transition-colors w-full max-w-lg"
    >
      <h2 className="text-xl font-semibold mb-3">העלה קובץ אודיו</h2>

      <input
        type="file"
        accept="audio/*"
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

      {file && <p className="mt-3 text-gray-700">{file.name}</p>}

      {!isUploading ? (
        <Button onClick={handleUpload} className="mt-4">
          העלה
        </Button>
      ) : (
        <p className="mt-4 text-gray-600">מעלה קובץ...</p>
      )}

      {uploadedUrl && (
        <>
          <div className="mt-6 text-sm text-green-700 break-all">
            <p>✅ קובץ הועלה:</p>
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
            disabled={isTranscribing}
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
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-8 bg-white border rounded-lg p-4 text-right shadow">
          <h3 className="text-lg font-semibold mb-4">🎧 תמלול עם דוברים:</h3>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-xl ${
                i % 2 === 0 ? "bg-gray-50" : "bg-gray-100"
              }`}
            >
              <p className="font-semibold text-blue-800">
                {seg.speaker || `דובר ${i + 1}`}:
              </p>
              <p className="text-gray-800 leading-relaxed">{seg.text.trim()}</p>
            </div>
          ))}

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Button onClick={() => handleDownload("txt")}>TXT 📄</Button>
            <Button onClick={() => handleDownload("json")}>JSON 🧩</Button>
            <Button onClick={() => handleDownload("csv")}>CSV 📊</Button>
            <Button onClick={() => handleDownload("srt")}>SRT 🎬</Button>
            <Button onClick={handleCopy}>📋 העתק תמלול</Button>
          </div>
        </div>
      )}
    </div>
  );
}
