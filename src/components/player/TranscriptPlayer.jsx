import React, { useRef, useState, useEffect, useCallback } from "react";

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

  // 🎨 צבעים עדינים לדוברים
  const speakerColors = [
    "border-blue-300 bg-blue-50",
    "border-green-300 bg-green-50",
    "border-purple-300 bg-purple-50",
    "border-pink-300 bg-pink-50",
  ];

  // 🧭 יצירת סדר הופעת הדוברים
  const speakerOrder = {};
  segments.forEach((seg) => {
    if (!speakerOrder[seg.speaker]) {
      speakerOrder[seg.speaker] = Object.keys(speakerOrder).length;
    }
  });

  // 🔧 עיצוב והזחה לפי צדדים (דובר 1 ימין, דובר 2 פנימה)
  const getSpeakerStyle = (speaker) => {
    const index = speakerOrder[speaker] % 2; // שני צדדים בלבד
    const indent = index === 0 ? 0 : 40; // דובר שני מוזח פנימה
    const color = speakerColors[index % speakerColors.length];
    return { indent, color };
  };

  // ⏱️ עדכון זמן נגן
  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  // 🎯 זיהוי הפסקה המושמעת (עם טולרנס קטן כדי שגם הראשונה תצבע)
  const activeIndex = segments.findIndex(
    (seg) => currentTime >= (seg.start - 0.3) && currentTime <= seg.end
  );

  // 🔁 גלילה אוטומטית למשפט הפעיל
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const lines = containerRef.current.querySelectorAll(".line");
    const activeLine = lines[activeIndex];
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeIndex, autoScroll]);

  // ⏸️ עצירת גלילה אוטומטית בזמן גלילה ידנית
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

  // ✏️ שינוי שם דובר
  const handleSpeakerRename = (oldName) => {
    const newName = prompt(
      `שם חדש עבור ${oldName}:`,
      speakerNames[oldName] || oldName
    );
    if (newName && newName !== oldName) {
      setSpeakerNames((prev) => ({ ...prev, [oldName]: newName }));
      setSegments((prev) =>
        prev.map((seg) =>
          seg.speaker === oldName ? { ...seg, speaker: newName } : seg
        )
      );
    }
  };

  // ✏️ עריכת מילה
  const splitWords = (text) => text.split(/(\s+)/);

  const handleWordDoubleClick = (segIndex, wordIndex) =>
    setIsEditing({ segIndex, wordIndex });

  const handleWordChange = (segIndex, wordIndex, newValue) => {
    setSegments((prev) =>
      prev.map((seg, i) => {
        if (i !== segIndex) return seg;
        const words = splitWords(seg.text);
        words[wordIndex] = newValue;
        return { ...seg, text: words.join("") };
      })
    );
  };

  // ▶️ לחיצה על משפט לקפיצה בנגן
  const handleClick = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  // 💾 הורדה משולבת (מקור + ערוך)
  const handleDownloadCombined = () => {
    const combined = {
      metadata: {
        app: "Tamleli Pro",
        exported_at: new Date().toISOString(),
      },
      original_transcript: originalSegments,
      edited_transcript: segments,
    };

    const blob = new Blob([JSON.stringify(combined, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript_combined.json";
    a.click();
    URL.revokeObjectURL(url);
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
              </span>{" "}
              {/* תוכן המשפט */}
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

      {/* כפתור הורדה משולבת */}
      <div className="flex justify-center mt-5">
        <button
          onClick={handleDownloadCombined}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          💾 הורד תמלול (מקור + ערוך)
        </button>
      </div>
    </div>
  );
}
