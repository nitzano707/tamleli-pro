import React, { useState } from "react";
import { Button } from "../ui/button";

export default function UploadBox() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return alert("בחר קובץ קודם");
    setIsUploading(true);

    // הדמיית טעינה
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 50));
      setProgress(i);
    }

    setIsUploading(false);
    alert("✅ ההעלאה הושלמה (מדומה)");
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
        className="hidden"
        id="audioInput"
      />
      <label
        htmlFor="audioInput"
        className="cursor-pointer text-blue-600 underline"
      >
        בחר קובץ מהמחשב
      </label>

      {file && <p className="mt-3 text-gray-700">{file.name}</p>}

      {isUploading ? (
        <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        <Button onClick={handleUpload} className="mt-4">
          העלה
        </Button>
      )}
    </div>
  );
}
