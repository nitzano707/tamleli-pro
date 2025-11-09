import React, { useState } from "react";
import { Button } from "../ui/button";

// 🔗 כתובות בסיס
const BASE_URL = "https://my-transcribe-proxy.onrender.com"; // Proxy ב-Render
const RUNPOD_URL = "https://api.runpod.ai/v2/lco4rijjwxicjyjl/run"; // Endpoint שלך ב-RunPod
const RUNPOD_TOKEN = "<הכנס כאן את ה-API Key שלך מ-RunPod>";

export default function UploadBox() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [transcript, setTranscript] = useState("");

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  // העלאת הקובץ ל-Render
  const handleUpload = async () => {
    if (!file) return alert("בחר קובץ קודם");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("שגיאה בשליחת הקובץ");
      const data = await response.json();

      setUploadedUrl(data.url);
      alert("✅ הקובץ הועלה בהצלחה!");
    } catch (error) {
      console.error("❌ שגיאה בהעלאה:", error);
      alert("שגיאה בהעלאה, נסה שוב");
    } finally {
      setIsUploading(false);
    }
  };

  // שליחה ל-RunPod לקבלת תמלול
  const handleTransc
