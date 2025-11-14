// 📄 src/components/player/TranscriptPlayer.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import {
  normalizeRunpodOutput,
  mergeConsecutiveBySpeaker,
} from "../../lib/transcriptNormalizer";

/**
 * 🎧 Tamleli Pro – נגן תמלול עם עריכה ושמירה בדרייב
 */
export default function TranscriptPlayer({
  mediaUrl,
  mediaType = "audio",
  transcriptId = null,
  transcriptData = [],
}) {
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const hasLoadedMedia = useRef(false);
  const hasInitialized = useRef(false); // 🔥 flag למניעת טעינה כפולה
  const clickTimer = useRef(null);
  const saveTimeoutRef = useRef(null);

  const [segments, setSegments] = useState(
    Array.isArray(transcriptData) ? transcriptData : []
  );

  const [originalSegments] = useState(
    Array.isArray(transcriptData) ? transcriptData : []
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [speakerNames, setSpeakerNames] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollTimeout, setScrollTimeout] = useState(null);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [loading, setLoading] = useState(!!transcriptId);
  const [driveMediaUrl, setDriveMediaUrl] = useState(mediaUrl || "");
  const [effectiveMediaType, setEffectiveMediaType] = useState(mediaType);

  // 🟦 הוספה חדשה — סטטוס שמירה
  const [saveState, setSaveState] = useState("saved"); 
  // saved | unsaved | saving | error

  // 🎨 צבעים לדוברים
  const speakerColors = ["2E74B5", "C0504D", "9BBB59", "8064A2", "4BACC6"];
  const speakerOrder = {};
  segments.forEach((seg) => {
    if (!speakerOrder[seg.speaker]) {
      speakerOrder[seg.speaker] = Object.keys(speakerOrder).length;
    }
  });

  // 🔥 מפתח ייחודי ל-localStorage
  const LOCAL_STORAGE_KEY = `tamleli_segments_${transcriptId || "temp"}`;

  // --------------------------------------------------
  // 📥 טעינת תמלול מדרייב או localStorage (פעם אחת בלבד)
  // --------------------------------------------------
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadTranscript = async () => {
      // אם יש transcriptData, השתמש בו
      if (Array.isArray(transcriptData) && transcriptData.length > 0) {
        setSegments(transcriptData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transcriptData));
        setLoading(false);
        return;
      }

      // 🔥 נסה לטעון את הסגמנטים מ-localStorage
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      let segmentsLoaded = false;

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          console.log("✅ טוען סגמנטים מ-localStorage:", parsed.length);
          setSegments(parsed);
          segmentsLoaded = true;
        } catch (e) {
          console.warn("⚠️ שגיאה בפרסור localStorage");
        }
      }

      if (!transcriptId) {
        setLoading(false);
        return;
      }

      // 🔥 תמיד טען את המדיה והמטא-דאטה מדרייב (גם אם הסגמנטים נטענו מ-localStorage)
      try {
        const token = localStorage.getItem("googleAccessToken");
        if (!token) {
          toast.error("פג תוקף ההרשאה. היכנס מחדש.", { duration: 3000 });
          setLoading(false);
          return;
        }

        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${transcriptId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("שגיאה בטעינת התמלול");

        const json = await res.json();

        if (json.mediaType) setEffectiveMediaType(json.mediaType);

        // 🔥 טען את המדיה מדרייב
        if (json.audioFileId && !hasLoadedMedia.current) {
          hasLoadedMedia.current = true;
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${json.audioFileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (mediaRes.ok) {
            const blob = await mediaRes.blob();
            const url = URL.createObjectURL(blob);
            setDriveMediaUrl(url);
            console.log("✅ מדיה נטענה מדרייב");
          }
        }

        // 🔥 אם לא טענו סגמנטים מ-localStorage, טען אותם מדרייב
        if (!segmentsLoaded) {
          let loadedSegments = [];

          if (json.schema_version === 1 && Array.isArray(json.segments)) {
            loadedSegments = json.segments;
          } else if (Array.isArray(json.edited_transcript)) {
            loadedSegments = json.edited_transcript;
          } else if (Array.isArray(json.segments)) {
            loadedSegments = json.segments;
          } else if (json.output?.transcription?.segments) {
            loadedSegments = mergeConsecutiveBySpeaker(
              normalizeRunpodOutput(json.output.transcription.segments)
            );
          } else if (Array.isArray(json.output)) {
            loadedSegments = mergeConsecutiveBySpeaker(
              normalizeRunpodOutput(json.output)
            );
          } else {
            loadedSegments = [];
          }

          console.log("✅ טוען סגמנטים מדרייב:", loadedSegments.length);
          setSegments(loadedSegments);
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify(loadedSegments)
          );
        }
      } catch (err) {
        console.error("❌ טעינת תמלול נכשלה:", err);
        toast.error("שגיאה בטעינת התמלול.", { duration: 3000 });
        if (!segmentsLoaded) {
          setSegments([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, []);
  // --------------------------------------------------
  // ⏱ ניגון – עדכון זמן
  // --------------------------------------------------
  const handleTimeUpdate = () => {
    if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
  };

  const activeIndex = segments.findIndex(
    (seg) =>
      currentTime >= (seg.start ?? 0) - 0.2 &&
      currentTime <= (seg.end ?? 0)
  );

  // --------------------------------------------------
  // 📜 גלילה אוטומטית
  // --------------------------------------------------
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const lines = containerRef.current.querySelectorAll(".line");
    if (lines[activeIndex])
      lines[activeIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex, autoScroll]);

  const handleUserScroll = useCallback(() => {
    setAutoScroll(false);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    const t = setTimeout(() => setAutoScroll(true), 5000);
    setScrollTimeout(t);
  }, [scrollTimeout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleUserScroll);
    return () => el.removeEventListener("scroll", handleUserScroll);
  }, [handleUserScroll]);

  // --------------------------------------------------
  // 💾 שמירה בדרייב (אסינכרונית ברקע)
  // --------------------------------------------------
  const saveToDrive = useCallback(async () => {
    setSaveState("saving"); // 🆕 הוספה

    try {
      // 🔥 תמיד קרא את הנתונים העדכניים מ-localStorage
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!localData) {
        console.warn("⚠️ אין נתונים ב-localStorage לשמירה");
        setSaveState("error"); // 🆕
        return;
      }

      const currentSegments = JSON.parse(localData);

      const id = transcriptId || localStorage.getItem("currentTranscriptId");
      if (!id) {
        console.warn("⚠️ אין transcriptId לשמירה");
        toast.error("⚠️ אין מזהה תמלול לשמירה", { duration: 2000 });
        setSaveState("error"); // 🆕
        return;
      }

      const token = localStorage.getItem("googleAccessToken");
      if (!token) {
        toast.error("❌ אין הרשאת גישה לדרייב", { duration: 2000 });
        setSaveState("error"); // 🆕
        return;
      }

      console.log("💾 מתחיל שמירה בדרייב...", { segmentsCount: currentSegments.length });

      const existingRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let prev = {};
      if (existingRes.ok) {
        try {
          prev = await existingRes.json();
        } catch (e) {
          console.warn("⚠️ לא הצלחנו לפרסר את הקובץ הקיים", e);
          prev = {};
        }
      }

      const versionHistory = Array.isArray(prev.versionHistory)
        ? prev.versionHistory
        : [];

      versionHistory.push({
        saved_at: new Date().toISOString(),
        segments_snapshot: currentSegments,
      });

      const updatedFile = {
        app: "Tamleli Pro",
        schema_version: 1,
        exported_at: new Date().toISOString(),
        audioFileId: prev.audioFileId ?? null,
        mediaType: prev.mediaType || effectiveMediaType,
        segments: currentSegments,
        edited_transcript: currentSegments,
        versionHistory,
      };

      const metadata = {
        name: prev.name || "Tamleli_Transcript.json",
        mimeType: "application/json",
      };

      const boundary = "-------314159265358979323846";
      const body =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(updatedFile) +
        `\r\n--${boundary}--`;

      const saveRes = await fetch(
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

      if (!saveRes.ok) {
        const errorText = await saveRes.text();
        console.error("❌ שגיאת שמירה:", errorText);
        setSaveState("error"); // 🆕
        throw new Error("שמירה נכשלה");
      }

      console.log("✅ נשמר בדרייב!");
      toast.success("✅ נשמר בדרייב!", { duration: 2000 });
      setSaveState("saved"); // 🆕

    } catch (err) {
      console.error("❌ שמירה בדרייב נכשלה:", err);
      toast.error("❌ שמירה נכשלה: " + err.message, { duration: 3000 });
      setSaveState("error"); // 🆕
    }
  }, [transcriptId, effectiveMediaType, LOCAL_STORAGE_KEY]);

  // --------------------------------------------------
  // 🔥 טריגר לשמירה בדרייב עם debounce
  // --------------------------------------------------
  const triggerDriveSave = useCallback(() => {
    setSaveState("unsaved"); // 🆕 הוספה

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToDrive();
    }, 1500);
  }, [saveToDrive]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // --------------------------------------------------
  // ✏️ עריכת שם דובר
  // --------------------------------------------------
  const handleSpeakerRename = (e, oldName) => {
    e.stopPropagation();

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }

    if (mediaRef.current) {
      setWasPlaying(!mediaRef.current.paused);
      mediaRef.current.pause();
    }

    const newName = prompt(
      `שם חדש עבור ${oldName}:`,
      speakerNames[oldName] || oldName
    );

    if (newName && newName !== oldName) {
      setSpeakerNames((prev) => ({ ...prev, [oldName]: newName }));

      const updated = segments.map((seg) =>
        seg.speaker === oldName ? { ...seg, speaker: newName } : seg
      );

      // 🔥 1. שמור ב-localStorage מיד
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      // 🔥 2. עדכן את ה-UI
      setSegments(updated);

      // 🔥 3. הפעל שמירה בדרייב ברקע
      setSaveState("unsaved"); // 🆕
      triggerDriveSave();
    }

    if (wasPlaying && mediaRef.current) mediaRef.current.play();
  };

  // --------------------------------------------------
  // ✏️ עריכת מילה
  // --------------------------------------------------
  const splitWords = (text) => String(text ?? "").split(/(\s+)/);

  const handleWordDoubleClick = (e, segIndex, wordIndex) => {
    e.stopPropagation();

    if (mediaRef.current) {
      setWasPlaying(!mediaRef.current.paused);
      mediaRef.current.pause();
    }

    const currentWords = splitWords(segments[segIndex].text);
    setEditingValue(currentWords[wordIndex]);
    setIsEditing({ segIndex, wordIndex });
  };

  const handleWordChange = (segIndex, wordIndex, newValue) => {
    const updated = segments.map((seg, i) => {
      if (i !== segIndex) return seg;
      const words = splitWords(seg.text);
      words[wordIndex] = newValue;
      return { ...seg, text: words.join("") };
    });

    // 🔥 1. שמור ב-localStorage מיד
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // 🔥 2. עדכן את ה-UI
    setSegments(updated);
    setIsEditing(null);

    // 🔥 3. הפעל שמירה בדרייב ברקע
    setSaveState("unsaved"); // 🆕
    triggerDriveSave();

    if (wasPlaying && mediaRef.current) {
      mediaRef.current.play();
    }
  };
  // --------------------------------------------------
  // 🕒 מעבר בנגן
  // --------------------------------------------------
  const handleLineClick = (time) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      return;
    }

    clickTimer.current = setTimeout(() => {
      if (mediaRef.current && typeof time === "number") {
        mediaRef.current.currentTime = time;
        mediaRef.current.play();
      }
      clickTimer.current = null;
    }, 200);
  };

  const formatTime = (s) => {
    if (s == null || isNaN(s)) return "";
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // --------------------------------------------------
  // הורדות
  // --------------------------------------------------
  const handleDownloadCombined = () => {
    const combined = {
      metadata: { app: "Tamleli Pro", exported_at: new Date().toISOString() },
      original_transcript: originalSegments,
      edited_transcript: segments,
      segments,
    };

    const blob = new Blob([JSON.stringify(combined, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "transcript_combined.json");
    toast.success("📥 הורדת JSON הושלמה!", { duration: 2000 });
  };

  const handleDownloadCSV = () => {
    if (!segments.length) {
      toast.error("אין נתונים להורדה", { duration: 2000 });
      return;
    }

    const header = ["start_time", "end_time", "speaker", "text"];
    const rows = segments.map((s) => [
      formatTime(s.start),
      formatTime(s.end),
      s.speaker,
      `"${String(s.text ?? "").replace(/"/g, '""')}"`,
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    saveAs(blob, "transcript.csv");
    toast.success("📥 הורדת CSV הושלמה!", { duration: 2000 });
  };

  const handleDownloadWord = async () => {
    try {
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
                    text: "תמלול",
                    bold: true,
                    size: 36,
                  }),
                ],
              }),

              ...segments.map((seg) => {
                const colorHex =
                  speakerColors[
                    speakerOrder[seg.speaker] % speakerColors.length
                  ];

                return new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  rightToLeft: true,
                  children: [
                    new TextRun({
                      text: RLE + seg.speaker + ": " + PDF,
                      bold: true,
                      color: colorHex,
                      size: 28,
                    }),
                    new TextRun({
                      text: RLE + String(seg.text ?? "") + PDF,
                      color: "000000",
                      size: 24,
                    }),
                  ],
                });
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "transcript.docx");
      toast.success("📥 הורדת Word הושלמה!", { duration: 2000 });
    } catch (err) {
      console.error("❌ שגיאה בהורדת Word:", err);
      toast.error("❌ שגיאה בהורדת Word", { duration: 2000 });
    }
  };

  // --------------------------------------------------
  // 🟡 UI — תצוגה
  // --------------------------------------------------
  if (loading)
    return (
      <p className="text-gray-600 mt-10 text-center">⏳ טוען תמלול...</p>
    );

  if (!segments?.length)
    return (
      <p className="text-gray-500 mt-10 text-center">⏳ אין נתונים להציג.</p>
    );

  return (
    <div className="w-full max-w-6xl mx-auto mt-6 text-right select-text">

      {/* 🔵🆕 חיווי שמירה — צף בפינה השמאלית העליונה */}
      <div className="fixed top-3 left-4 z-40 text-sm bg-white/90 px-3 py-1.5 rounded-xl shadow border">
        {saveState === "saved" && (
          <span className="text-green-600">✓ כל השינויים נשמרו</span>
        )}
        {saveState === "unsaved" && (
          <span className="text-orange-600">… יש שינויים שלא נשמרו</span>
        )}
        {saveState === "saving" && (
          <span className="text-blue-600 flex items-center gap-2">
            <span className="animate-spin h-3 w-3 border border-t-transparent border-blue-600 rounded-full"></span>
            שומר שינויים בדרייב...
          </span>
        )}
        {saveState === "error" && (
          <span className="text-red-600">
            ⚠️ שגיאה בשמירה —{" "}
            <button className="underline" onClick={saveToDrive}>
              נסה שוב
            </button>
          </span>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-4 text-center">
        <p>
          💡 <strong>לחיצה כפולה</strong> על דובר או מילה כדי לערוך.
          <br />
          🎯 <strong>לחיצה רגילה</strong> על שורה כדי לדלג לזמן הזה בניגון.
          <br />
          💾 <strong>שמירה אוטומטית</strong> מתבצעת 1.5 שניות אחרי כל עריכה.
        </p>
      </div>

      {effectiveMediaType === "video" ? (
        <video
          ref={mediaRef}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full rounded-lg mb-4 max-h-[500px] bg-black"
          src={driveMediaUrl || mediaUrl}
        />
      ) : (
        <audio
          ref={mediaRef}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full rounded-lg mb-4"
          src={driveMediaUrl || mediaUrl}
        />
      )}
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50 shadow-inner"
      >
        {segments.map((seg, i) => {
          const index = speakerOrder[seg.speaker] ?? 0;
          const indent = index % 2 ? 40 : 0;
          const color = speakerColors[index % speakerColors.length];
          const words = splitWords(seg.text);
          const displaySpeaker =
            speakerNames[seg.speaker] || seg.speaker || "דובר";
          const isActive = i === activeIndex;

          return (
            <div
              key={i}
              onClick={() => handleLineClick(seg.start)}
              style={{ marginRight: indent }}
              className={`line group mb-4 p-3 border rounded-xl shadow-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-yellow-100 border-yellow-400"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {formatTime(seg.start)} – {formatTime(seg.end)}
              </div>

              {/* 🔊 דובר */}
              <span
                className="font-semibold text-sm cursor-pointer select-none hover:underline"
                style={{ color: `#${color}` }}
                onDoubleClick={(e) => handleSpeakerRename(e, seg.speaker)}
              >
                {displaySpeaker}:
              </span>

              {/* ✏ מילים */}
              <span> </span>
              {words.map((word, wIndex) => {
                const editing =
                  isEditing?.segIndex === i &&
                  isEditing?.wordIndex === wIndex;

                return editing ? (
                  <input
                    key={`${i}-${wIndex}-edit`}
                    type="text"
                    defaultValue={editingValue}
                    autoFocus
                    className="border-b-2 border-green-500 outline-none text-sm mx-1 bg-transparent min-w-[20px]"
                    style={{
                      width: `${Math.max(editingValue.length * 8, 20)}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      handleWordChange(i, wIndex, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleWordChange(i, wIndex, e.target.value);
                      }
                      if (e.key === "Escape") {
                        setIsEditing(null);
                      }
                    }}
                  />
                ) : (
                  <span
                    key={`${i}-${wIndex}`}
                    className="text-gray-800 hover:bg-blue-100 rounded px-0.5 cursor-text transition-colors"
                    onDoubleClick={(e) =>
                      handleWordDoubleClick(e, i, wIndex)
                    }
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 📥 הורדות */}
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          onClick={handleDownloadWord}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          📝 הורד Word
        </button>

        <button
          onClick={handleDownloadCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          📊 הורד CSV
        </button>

        {false && (
          <button
            onClick={handleDownloadCombined}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            💾 הורד JSON (מקור + ערוך)
          </button>
        )}
      </div>
    </div>
  );
}
