import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";

// 🧠 נורמליזציה (למקרה שטוענים JSON ישן או פלט "גולמי")
import {
  normalizeRunpodOutput,
  mergeConsecutiveBySpeaker,
} from "../../lib/transcriptNormalizer";

/**
 * 🎧 Tamleli Pro – נגן תמלול עם עריכה ושמירה בדרייב / מקומית
 *
 * props:
 * - mediaUrl:    כתובת מדיה (פרוקסי/זמנית) במעמד ההעלאה
 * - mediaType:   "audio" | "video" (ברירת מחדל "audio")
 * - transcriptId: מזהה קובץ JSON בדרייב (לטעינה מחדש)
 * - transcriptData: מערך סגמנטים מוכן להצגה (למעמד "פעם ראשונה")
 */
export default function TranscriptPlayer({
  mediaUrl,
  mediaType = "audio",
  transcriptId = null,
  transcriptData = [],
}) {
  const mediaRef = useRef(null);           // יכול להיות <audio> או <video>
  const containerRef = useRef(null);

  // 🔽 State
  const [segments, setSegments] = useState(Array.isArray(transcriptData) ? transcriptData : []);
  const [originalSegments] = useState(Array.isArray(transcriptData) ? transcriptData : []);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(null);
  const [speakerNames, setSpeakerNames] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollTimeout, setScrollTimeout] = useState(null);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [loading, setLoading] = useState(!!transcriptId);

  // 🧩 תמיכה מלאה גם באודיו וגם בווידאו
  const [driveMediaUrl, setDriveMediaUrl] = useState(mediaUrl || "");
  const [effectiveMediaType, setEffectiveMediaType] = useState(mediaType || "audio");

  // 🎨 צבעים לדוברים
  const speakerColors = ["2E74B5", "C0504D", "9BBB59", "8064A2", "4BACC6"];
  const speakerOrder = {};
  segments.forEach((seg) => {
    if (!speakerOrder[seg.speaker]) {
      speakerOrder[seg.speaker] = Object.keys(speakerOrder).length;
    }
  });

  // 🎧 טעינת תמלול מהדרייב (אם יש transcriptId)
  useEffect(() => {
    const fetchTranscript = async () => {
      if (!transcriptId) {
        // אין קובץ לטעון מהדרייב – משתמשים ב-transcriptData שהתקבל מ-UploadBox
        return setLoading(false);
      }
      try {
        localStorage.setItem("currentTranscriptId", transcriptId);

        const token = localStorage.getItem("googleAccessToken");
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${transcriptId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("שגיאה בשליפת תמלול מהדרייב");
        const json = await res.json();

        // ✅ קביעת סוג מדיה מקובץ ה-JSON אם קיים
        if (json.mediaType) setEffectiveMediaType(json.mediaType);

        // ✅ טעינת מדיה מדרייב אם נשמר audioFileId
        if (json.audioFileId) {
          try {
            const mediaRes = await fetch(
              `https://www.googleapis.com/drive/v3/files/${json.audioFileId}?alt=media`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (mediaRes.ok) {
              const blob = await mediaRes.blob();
              const url = URL.createObjectURL(blob);
              setDriveMediaUrl(url);
            } else {
              console.warn("⚠️ לא ניתן לטעון קובץ מדיה מהדרייב");
            }
          } catch (err) {
            console.error("❌ שגיאה בטעינת המדיה מדרייב:", err);
          }
        }

        // ✅ תמיכה במבנה החדש (אחיד) schema_version:1
        if (json.schema_version === 1 && Array.isArray(json.segments)) {
          setSegments(json.segments);
        }
        // ✅ תאימות לאחור: קבצים ישנים/פלט גולמי
        else if (Array.isArray(json.edited_transcript)) {
          setSegments(json.edited_transcript);
        } else if (Array.isArray(json.original_transcript)) {
          setSegments(json.original_transcript);
        } else if (Array.isArray(json.segments)) {
          setSegments(json.segments);
        } else if (json.output?.transcription?.segments) {
          const norm = mergeConsecutiveBySpeaker(
            normalizeRunpodOutput(json.output.transcription.segments)
          );
          setSegments(norm);
        } else if (Array.isArray(json.output)) {
          const norm = mergeConsecutiveBySpeaker(normalizeRunpodOutput(json.output));
          setSegments(norm);
        } else if (Array.isArray(json)) {
          // במידה ונטען JSON שהוא פשוט מערך
          setSegments(json);
        } else {
          console.warn("⚠️ מבנה קובץ תמלול לא מזוהה:", json);
          setSegments([]);
        }
      } catch (err) {
        console.error("❌ שגיאה בטעינת קובץ תמלול:", err);
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [transcriptId]);

  // 🧷 כלי עזר
  const getSpeakerStyle = (speaker) => {
    const index = speakerOrder[speaker] % 2;
    const indent = index === 0 ? 0 : 40;
    const color = speakerColors[index % speakerColors.length];
    return { indent, color };
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
  };

  const activeIndex = segments.findIndex(
    (seg) => typeof seg.start === "number" && typeof seg.end === "number"
      ? currentTime >= (seg.start - 0.3) && currentTime <= seg.end
      : false
  );

  // 📜 גלילה אוטומטית לשורה הפעילה
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const lines = containerRef.current.querySelectorAll(".line");
    const activeLine = lines[activeIndex];
    if (activeLine) activeLine.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex, autoScroll]);

  const handleUserScroll = useCallback(() => {
    setAutoScroll(false);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    const timeout = setTimeout(() => setAutoScroll(true), 5000);
    setScrollTimeout(timeout);
  }, [scrollTimeout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleUserScroll);
    return () => el.removeEventListener("scroll", handleUserScroll);
  }, [handleUserScroll]);

  const handleSpeakerRename = (oldName) => {
    if (mediaRef.current) {
      setWasPlaying(!mediaRef.current.paused);
      mediaRef.current.pause();
    }
    const newName = prompt(`שם חדש עבור ${oldName}:`, speakerNames[oldName] || oldName);
    if (newName && newName !== oldName) {
      setSpeakerNames((prev) => ({ ...prev, [oldName]: newName }));
      setSegments((prev) =>
        prev.map((seg) => (seg.speaker === oldName ? { ...seg, speaker: newName } : seg))
      );
    }
    if (wasPlaying && mediaRef.current) mediaRef.current.play();
  };

  const splitWords = (text) => String(text ?? "").split(/(\s+)/); // ⚠️ מגן מפני undefined

  const handleWordDoubleClick = (segIndex, wordIndex) => {
    if (mediaRef.current) {
      setWasPlaying(!mediaRef.current.paused);
      mediaRef.current.pause();
    }
    setIsEditing({ segIndex, wordIndex });
  };

  const handleWordChange = (segIndex, wordIndex, newValue) => {
    setSegments((prev) =>
      prev.map((seg, i) => {
        if (i !== segIndex) return seg;
        const words = splitWords(seg.text);
        words[wordIndex] = newValue;
        return { ...seg, text: words.join("") };
      })
    );
    if (wasPlaying && mediaRef.current) mediaRef.current.play();
  };

  const handleClick = (time) => {
    if (mediaRef.current && typeof time === "number") {
      mediaRef.current.currentTime = time;
      mediaRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return "";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // 💾 שמירת גרסה בדרייב (PATCH) – שומר metadata + היסטוריה
  const handleSaveEdited = async () => {
    try {
      const id = transcriptId || localStorage.getItem("currentTranscriptId");
      if (!id) throw new Error("לא נמצא מזהה קובץ (transcriptId)");

      const token = localStorage.getItem("googleAccessToken");
      if (!token) throw new Error("אין טוקן גישה פעיל, יש להתחבר מחדש.");

      // טען קיים כדי לשמר שדות/היסטוריה
      const existingRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let prev = {};
      try {
        prev = await existingRes.json();
      } catch {
        prev = {};
      }

      const versionHistory = Array.isArray(prev.versionHistory) ? prev.versionHistory : [];
      versionHistory.push({
        saved_at: new Date().toISOString(),
        segments_snapshot: segments,
      });

      // שימור שדות חשובים + סכימה אחידה
      const edited = {
        app: "Tamleli Pro",
        schema_version: 1,
        exported_at: new Date().toISOString(),
        audioFileId: prev.audioFileId ?? null,
        mediaType: prev.mediaType || effectiveMediaType || "audio",
        // כדי לשמור תאימות לאחור נעדכן גם edited_transcript, אך השדה הקאנוני הוא segments
        segments,
        edited_transcript: segments,
        versionHistory,
      };

      // PATCH Multipart (Metadata+Content JSON)
      const metadata = { name: prev.name || "Tamleli_Transcript.json", mimeType: "application/json" };
      const boundary = "-------314159265358979323846";
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(edited) +
        `\r\n--${boundary}--`;

      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );

      if (res.status === 401) {
        alert("⚠️ ההרשאה פגה. אנא התחבר מחדש לחשבון Google שלך.");
        return;
      }

      if (!res.ok) throw new Error(`שגיאה: ${res.statusText}`);
      alert("✅ גרסה חדשה של התמלול נשמרה בדרייב!");
    } catch (err) {
      console.error("❌ שגיאה בשמירה בדרייב:", err);
      alert("❌ שמירת התמלול נכשלה.");
    }
  };

  // 💾 הורדת JSON (מקור + ערוך)
  const handleDownloadCombined = () => {
    const combined = {
      metadata: { app: "Tamleli Pro", exported_at: new Date().toISOString() },
      original_transcript: originalSegments,
      edited_transcript: segments,
      segments, // שמירה גם בשדה הקאנוני
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "transcript_combined.json");
  };

  // 📝 הורדת Word בעברית
  const handleDownloadWord = async () => {
    const RLE = "\u202B";
    const PDF = "\u202C";

    const doc = new Document({
      sections: [
        {
          properties: { rightToLeft: true, bidirectional: true },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              rightToLeft: true,
              children: [
                new TextRun({
                  text: "תמלול עם דוברים",
                  bold: true,
                  size: 36,
                  font: { name: "David", hint: "eastAsia" },
                  language: { value: "he-IL" },
                }),
              ],
            }),
            ...segments.map((seg) => {
              const colorHex = speakerColors[speakerOrder[seg.speaker] % speakerColors.length];
              return new Paragraph({
                alignment: AlignmentType.RIGHT,
                rightToLeft: true,
                children: [
                  new TextRun({
                    text: RLE + (seg.speaker ?? "דובר") + ": " + PDF,
                    bold: true,
                    color: colorHex,
                    font: { name: "David", hint: "eastAsia" },
                    size: 28,
                    language: { value: "he-IL" },
                  }),
                  new TextRun({
                    text: RLE + String(seg.text ?? "") + PDF,
                    color: "000000",
                    font: { name: "David", hint: "eastAsia" },
                    size: 24,
                    language: { value: "he-IL" },
                  }),
                ],
              });
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "transcript_hebrew.docx");
  };

  // 📊 הורדת CSV
  const handleDownloadCSV = () => {
    if (!segments.length) return;
    const header = ["start_time", "end_time", "speaker", "text"];
    const rows = segments.map((s) => [
      formatTime(s.start),
      formatTime(s.end),
      s.speaker,
      `"${String(s.text ?? "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    saveAs(blob, "transcript_hebrew.csv");
  };

  // 🟡 UI – מצבים ריקים/טעינה
  if (loading) return <p className="text-gray-600 mt-10">⏳ טוען תמלול מהדרייב...</p>;
  if (!segments?.length)
    return (
      <div className="text-gray-500 mt-4">
        ⏳ אין נתונים להצגה.
      </div>
    );

  return (
    <div className="w-full max-w-6xl mx-auto mt-6 text-right">
      <p className="text-sm text-gray-500 mb-2">
        💡 לחיצה על משפט → דילוג בנגן | לחיצה כפולה על שם דובר → שינוי | לחיצה כפולה על מילה → תיקון
      </p>

      {effectiveMediaType === "video" ? (
        <video
          ref={mediaRef}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full mb-4 rounded-lg max-h-[500px] bg-black"
          src={driveMediaUrl || mediaUrl}
        />
      ) : (
        <audio
          ref={mediaRef}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full mb-4 rounded-lg"
          src={driveMediaUrl || mediaUrl}
        />
      )}

      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50 shadow-inner"
      >
        {segments.map((seg, i) => {
          const { color, indent } = getSpeakerStyle(seg.speaker ?? "דובר");
          const words = splitWords(seg.text);
          const displaySpeaker = speakerNames[seg.speaker] || seg.speaker || "דובר";
          const isActive = i === activeIndex;

          return (
            <div
              key={i}
              onClick={() => handleClick(seg.start)}
              style={{ marginRight: `${indent}px` }}
              className={`line mb-4 p-3 border rounded-2xl shadow-sm transition-all cursor-pointer ${
                isActive ? "bg-yellow-100 border-yellow-400" : "bg-white"
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {formatTime(seg.start)} - {formatTime(seg.end)}
              </div>

              <span
                className="font-semibold text-sm text-gray-700 cursor-pointer select-none"
                onDoubleClick={() => handleSpeakerRename(seg.speaker ?? "דובר")}
                style={{ color: `#${color}` }}
              >
                {displaySpeaker}:
              </span>{" "}
              {words.map((word, wIndex) => {
                const editing =
                  isEditing?.segIndex === i && isEditing?.wordIndex === wIndex;
                return editing ? (
                  <input
                    key={wIndex}
                    type="text"
                    className="border-b border-gray-400 mx-1 outline-none text-sm"
                    defaultValue={word}
                    autoFocus
                    onBlur={(e) => {
                      handleWordChange(i, wIndex, e.target.value);
                      setIsEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleWordChange(i, wIndex, e.target.value);
                        setIsEditing(null);
                      }
                    }}
                  />
                ) : (
                  <span
                    key={wIndex}
                    onDoubleClick={() => handleWordDoubleClick(i, wIndex)}
                    className="text-gray-800"
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <button
          onClick={handleSaveEdited}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
        >
          ☁️ שמור גרסה בדרייב
        </button>
        <button
          onClick={handleDownloadWord}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
        >
          📝 הורד Word
        </button>
        <button
          onClick={handleDownloadCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          📊 הורד CSV
        </button>
        <button
          onClick={handleDownloadCombined}
          className="bg-teאל-600 hover:bg-teאל-700 text-white px-4 py-2 rounded-lg transition"
        >
          💾 הורד JSON (מקור + ערוך)
        </button>
      </div>
    </div>
  );
}
