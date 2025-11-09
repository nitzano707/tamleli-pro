import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  SectionType,
} from "docx";
import { saveAs } from "file-saver";

export default function TranscriptPlayer({ audioUrl, transcriptData = [] }) {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [segments, setSegments] = useState(transcriptData);
  const [originalSegments] = useState(transcriptData);
  const [isEditing, setIsEditing] = useState(null);
  const [speakerNames, setSpeakerNames] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollTimeout, setScrollTimeout] = useState(null);
  const [wasPlaying, setWasPlaying] = useState(false);

  // 🎨 צבעי רקע למסגרות דוברים בממשק
  const speakerColors = [
    "border-blue-300 bg-blue-50",
    "border-green-300 bg-green-50",
    "border-purple-300 bg-purple-50",
    "border-pink-300 bg-pink-50",
  ];

  // 🧭 סדר הופעת הדוברים
  const speakerOrder = {};
  segments.forEach((seg) => {
    if (!speakerOrder[seg.speaker]) {
      speakerOrder[seg.speaker] = Object.keys(speakerOrder).length;
    }
  });

  // 🔧 עיצוב והזחה (שני צדדים)
  const getSpeakerStyle = (speaker) => {
    const index = speakerOrder[speaker] % 2;
    const indent = index === 0 ? 0 : 40;
    const color = speakerColors[index % speakerColors.length];
    return { indent, color };
  };

  // ⏱️ עדכון זמן נגן
  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  // 🎯 זיהוי הפסקה הפעילה (טולרנס קטן כדי שגם הראשונה תיצבע)
  const activeIndex = segments.findIndex(
    (seg) => currentTime >= (seg.start - 0.3) && currentTime <= seg.end
  );

  // 🔁 גלילה אוטומטית לפסקה הפעילה
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const lines = containerRef.current.querySelectorAll(".line");
    const activeLine = lines[activeIndex];
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeIndex, autoScroll]);

  // ⏸️ עצירת הגלילה האוטומטית כאשר המשתמש גולל ידנית
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

  // ✏️ שינוי שם דובר (עוצר נגן בזמן עריכה ומחדש בסיום)
  const handleSpeakerRename = (oldName) => {
    if (audioRef.current) {
      setWasPlaying(!audioRef.current.paused);
      audioRef.current.pause();
    }
    const newName = prompt(`שם חדש עבור ${oldName}:`, speakerNames[oldName] || oldName);
    if (newName && newName !== oldName) {
      setSpeakerNames((prev) => ({ ...prev, [oldName]: newName }));
      setSegments((prev) =>
        prev.map((seg) =>
          seg.speaker === oldName ? { ...seg, speaker: newName } : seg
        )
      );
    }
    if (wasPlaying && audioRef.current) audioRef.current.play();
  };

  // ✏️ עריכת מילה (עוצר נגן בזמן עריכה ומחדש בסיום)
  const splitWords = (text) => text.split(/(\s+)/);

  const handleWordDoubleClick = (segIndex, wordIndex) => {
    if (audioRef.current) {
      setWasPlaying(!audioRef.current.paused);
      audioRef.current.pause();
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
    if (wasPlaying && audioRef.current) audioRef.current.play();
  };

  // ▶️ קפיצה בזמן בלחיצה על פסקה
  const handleClick = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  // 💾 הורדת JSON משולב (מקור + ערוך)
  const handleDownloadCombined = () => {
    const combined = {
      metadata: { app: "Tamleli Pro", exported_at: new Date().toISOString() },
      original_transcript: originalSegments,
      edited_transcript: segments,
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "transcript_combined.json");
  };

  // 📝 הורדת Word – RTL, יישור לימין, צבעי דוברים, חותמות זמן
  const handleDownloadWord = async () => {
    // צבעים לשמות דוברים ב-HEX (ללא #)
    const colors = ["0066CC", "CC0000", "009900", "990099"];
    const colorMap = {};
    let colorIndex = 0;

    const doc = new Document({
      sections: [
        {
          properties: { type: SectionType.CONTINUOUS, rightToLeft: true },
          children: [
            new Paragraph({
              text: "תמלול עם דוברים",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.RIGHT,
            }),
            ...segments.flatMap((seg) => {
              if (!colorMap[seg.speaker]) {
                colorMap[seg.speaker] = colors[colorIndex % colors.length];
                colorIndex++;
              }
              const nameColor = colorMap[seg.speaker];

              return [
                // שם הדובר
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({
                      text: `${seg.speaker}: `,
                      bold: true,
                      color: nameColor,
                      size: 28, // 14pt
                      font: "David",
                    }),
                  ],
                }),
                // חותמות זמן
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({
                      text:
                        seg.start !== undefined && seg.end !== undefined
                          ? `⏱️ ${seg.start.toFixed(2)}s – ${seg.end.toFixed(2)}s`
                          : "",
                      color: "777777",
                      size: 18, // 9pt
                      font: "David",
                      italics: true,
                    }),
                  ],
                }),
                // תוכן הפסקה
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({
                      text: seg.text,
                      color: "000000",
                      size: 24, // 12pt
                      font: "David",
                    }),
                  ],
                }),
                // רווח בין דוברים
                new Paragraph({ text: "", spacing: { before: 100 } }),
              ];
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "transcript_rtl.docx");
  };

  // 📊 הורדת CSV בעברית (כולל BOM ל-Excel)
  const handleDownloadCSV = () => {
    if (!segments.length) return;
    const header = ["start_time", "end_time", "speaker", "text"];
    const rows = segments.map((s) => [
      s.start?.toFixed(2) || "",
      s.end?.toFixed(2) || "",
      s.speaker,
      `"${s.text.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "transcript_hebrew.csv");
  };

  if (!segments?.length)
    return <div className="text-gray-500 mt-4">⏳ אין נתונים להצגה.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto mt-6 text-right">
      <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
        💡 ניתן ללחוץ על משפט כדי לדלג בנגן, ללחוץ פעמיים על שם דובר כדי לעדכן אותו,
        וללחוץ על מילים כדי לתקן אותן.
      </p>

      <audio
        ref={audioRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full mb-4 rounded-lg"
        src={audioUrl}
      ></audio>

      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50 shadow-inner"
      >
        {segments.map((seg, i) => {
          const { color, indent } = getSpeakerStyle(seg.speaker);
          const words = splitWords(seg.text);
          const displaySpeaker = speakerNames[seg.speaker] || seg.speaker;
          const isActive = i === activeIndex;

          return (
            <div
              key={i}
              onClick={() => handleClick(seg.start)}
              style={{ marginRight: `${indent}px` }}
              className={`line mb-4 p-3 border ${color} rounded-2xl shadow-sm transition-all cursor-pointer ${
                isActive ? "bg-yellow-100 border-yellow-400" : ""
              }`}
            >
              {/* שם הדובר */}
              <span
                className="font-semibold text-sm text-gray-700 cursor-pointer select-none"
                onDoubleClick={() => handleSpeakerRename(seg.speaker)}
              >
                {displaySpeaker}:
              </span>

              {/* 🕒 חותמות זמן */}
              <div className="text-xs text-gray-500 mt-1 mb-1">
                {seg.start !== undefined && seg.end !== undefined
                  ? `⏱️ ${seg.start.toFixed(2)}s – ${seg.end.toFixed(2)}s`
                  : ""}
              </div>

              {/* התוכן (עריכת מילים בלחיצה כפולה) */}
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
          onClick={handleDownloadWord}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
        >
          📝 הורד Word
        </button>
        <button
          onClick={handleDownloadCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
        >
          📊 הורד CSV
        </button>
        <button
          onClick={handleDownloadCombined}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          💾 הורד JSON (מקור + ערוך)
        </button>
      </div>
    </div>
  );
}
