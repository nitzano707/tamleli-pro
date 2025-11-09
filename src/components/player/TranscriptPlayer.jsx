import React, { useRef, useState, useEffect } from "react";

/**
 * TranscriptPlayer.jsx
 * ---------------------
 * נגן אודיו מסונכרן עם תמלול (בשלב זה – דוגמה מדומה)
 */
const TranscriptPlayer = () => {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // דוגמת תמלול מדומה (נחליף בהמשך בתמלול אמיתי מ־RunPod)
  const transcriptData = [
    { start: 0.0, end: 3.8, speaker: "SPEAKER_00", text: "שלום וברוכים הבאים לראיון שלנו היום." },
    { start: 3.8, end: 8.2, speaker: "SPEAKER_01", text: "תודה רבה, שמח להיות כאן איתך." },
    { start: 8.2, end: 12.5, speaker: "SPEAKER_00", text: "אז נתחיל בשאלה הראשונה — ספרי קצת על עצמך." },
    { start: 12.5, end: 16.9, speaker: "SPEAKER_01", text: "אני מורה בבית ספר יסודי ומובילה תוכנית למידה חדשנית." }
  ];

  // מעקב אחר זמן הנגן
  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  // פונקציה שמזהה איזו שורה פעילה
  const getActiveIndex = () => {
    return transcriptData.findIndex(
      (segment) => currentTime >= segment.start && currentTime <= segment.end
    );
  };

  const activeIndex = getActiveIndex();

  // מאפשר קפיצה בזמן ע"י לחיצה על שורה
  const handleClick = (time) => {
    audioRef.current.currentTime = time;
    audioRef.current.play();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded-xl shadow">
      <audio
        ref={audioRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full mb-4"
        src="https://cdn.pixabay.com/download/audio/2023/03/06/audio_06d2f79b66.mp3?filename=short-interview-sample.mp3"
      ></audio>

      <div className="space-y-2">
        {transcriptData.map((segment, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg cursor-pointer transition-all ${
              index === activeIndex
                ? "bg-blue-100 border-r-4 border-blue-500"
                : "hover:bg-gray-50"
            }`}
            onClick={() => handleClick(segment.start)}
          >
            <span className="font-semibold text-sm text-gray-600">
              {segment.speaker.replace("_", " ")}:
            </span>{" "}
            <span className="text-gray-800">{segment.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptPlayer;
