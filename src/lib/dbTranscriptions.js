// 📄 src/lib/dbTranscriptions.js

// ✅ גרסה מעודכנת: פעולות DB מתבצעות דרך השרת המאובטח (Render) במקום ישירות ל־Supabase

import { supabase } from "./supabaseClient";

const PROXY_URL = "https://my-transcribe-proxy.onrender.com";

/**
 * 🟢 יצירת רשומת תמלול חדשה ב־DB (דרך השרת)
 * @param {string} userEmail - אימייל המשתמש המחובר
 * @param {string} alias - שם התמלול
 * @param {string} folderId - מזהה תיקייה בדרייב
 * @param {string|null} audioId - מזהה קובץ אודיו בדרייב
 * @param {string} mediaType - סוג המדיה ("audio" או "video")
 */
export async function createTranscription(
  userEmail,
  alias,
  folderId,
  audioId = null,
  mediaType = "audio"
) {
  try {
    const response = await fetch(`${PROXY_URL}/db/transcriptions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: userEmail,
        alias,
        folder_id: folderId,
        audio_id: audioId,
        media_type: mediaType,
      }),
    });

    const res = await response.json();
    if (!response.ok) throw new Error(res.error || "שגיאה ביצירת תמלול");

    console.log("✅ נוצרה רשומת תמלול:", res.data);
    return res.data?.[0] || null;
  } catch (err) {
    console.error("❌ שגיאה כללית ביצירת תמלול:", err);
    return null;
  }
}

/**
 * 🟡 עדכון רשומת תמלול (כל שדה)
 * @param {string} id - מזהה רשומת התמלול
 * @param {object} updates - האובייקט עם העדכונים
 */
export async function updateTranscription(id, updates) {
  try {
    const response = await fetch(`${PROXY_URL}/db/transcriptions/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });

    const res = await response.json();
    if (!response.ok) throw new Error(res.error || "שגיאה בעדכון תמלול");

    console.log("✅ עודכן תמלול:", res.data?.[0]);
    return res.data?.[0] || null;
  } catch (err) {
    console.error("❌ שגיאה כללית בעדכון תמלול:", err);
    return null;
  }
}

/**
 * 🔵 עדכון מזהה קובץ האודיו בדרייב
 * @param {string} id - מזהה רשומה
 * @param {string} audioId - מזהה קובץ אודיו בדרייב
 */
export async function updateAudioId(id, audioId) {
  return updateTranscription(id, { audio_id: audioId });
}

/**
 * 🔵 עדכון מזהה קובץ התמלול בדרייב
 * @param {string} id - מזהה רשומה
 * @param {string} transcriptId - מזהה קובץ תמלול בדרייב
 */
export async function updateTranscriptId(id, transcriptId) {
  return updateTranscription(id, { transcript_id: transcriptId });
}

/**
 * ✏️ עדכון שם התמלול (alias)
 * @param {string} id - מזהה רשומה
 * @param {string} newAlias - שם חדש
 */
export async function updateAlias(id, newAlias) {
  return updateTranscription(id, { alias: newAlias });
}

/**
 * 📋 שליפת כל התמלולים של משתמש
 * (שליפה ישירה מ-Supabase כי זו פעולה קריאה בלבד)
 * @param {string} userEmail - אימייל המשתמש
 */
export async function getTranscriptions(userEmail) {
  try {
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("⚠️ שגיאה בשליפת תמלולים:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("❌ שגיאה כללית בשליפת תמלולים:", err);
    return [];
  }
}

/**
 * 🗑️ מחיקת רשומת תמלול (דרך השרת)
 * @param {string} id - מזהה רשומת תמלול
 */
export async function deleteTranscription(id) {
  try {
    const response = await fetch(`${PROXY_URL}/db/transcriptions/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const res = await response.json();
    if (!response.ok) throw new Error(res.error || "שגיאה במחיקה");

    console.log("🗑️ נמחק תמלול:", id);
    return true;
  } catch (err) {
    console.error("❌ שגיאה כללית במחיקת תמלול:", err);
    return false;
  }
}
