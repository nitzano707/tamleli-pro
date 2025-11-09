import React, { useRef, useState, useEffect } from "react";

/**
 * TranscriptPlayer.jsx
 * ---------------------
 * נגן אודיו מסונכרן עם תמלול אמיתי (כולל דוברים)
 * מקבל מה־props:
 *  - audioUrl (כתובת הקובץ)
 *  - transcriptData (מערך עם { start, end, speaker, text })
 */

export default function TranscriptPlayer({ audioUrl, transcriptData = [] }) {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // עדכון זמן נגן
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // מזהה את השורה הפעילה לפי הזמן
  const activeIndex = transcriptData.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  // קפיצה בזמן בלחיצה על שורה
  const handleClick = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  // גלילה אוטומטית לשורה הפעילה
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector(".active-line");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  if (!transcriptData || transcriptData.length === 0) {
    return (
      <div className="text-gray-600 mt-4">
        ⏳ אין עדיין נתוני תמלול להצגה.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 text-right">
      {/* 🎵 נגן אודיו */}
      <audio
        ref={audioRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full mb-4 rounded-lg"
        src={audioUrl}
      ></audio>

      {/* 💬 טקסט מסונכרן */}
      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50 shadow-inner"
      >
        {transcriptData.map((seg, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg cursor-pointer mb-1 transition-all ${
              i === activeIndex
                ? "bg-blue-100 border-r-4 border-blue-500 active-line"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleClick(seg.start)}
          >
            <span className="font-semibold text-sm text-gray-700">
              {seg.speaker || `דובר ${i + 1}`}:
            </span>{" "}
            <span className="text-gray-800 leading-relaxed">{seg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
