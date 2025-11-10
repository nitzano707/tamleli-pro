// 📄 src/lib/dbTranscriptions.js
import { supabase } from "./supabaseClient";

/**
 * 🟢 יצירת רשומה חדשה בטבלת transcriptions
 * @param {string} userEmail - אימייל המשתמש המחובר
 * @param {string} alias - שם התמלול שבחר
 * @param {string} folderId - מזהה התיקייה בדרייב
 * @param {string|null} audioId - מזהה קובץ האודיו בדרייב
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
    const { data, error } = await supabase
      .from("transcriptions")
      .insert([
        {
          user_email: userEmail,
          alias,
          folder_id: folderId,
          audio_id: audioId,
          media_type: mediaType, // ✅ שמירת סוג המדיה
        },
      ])
      .select();

    if (error) {
      console.error("❌ שגיאה ביצירת רשומת תמלול:", error);
      return null;
    }

    if (!data || !data.length) {
      console.warn("⚠️ לא הוחזרה רשומת תמלול מ-Supabase:", data);
      return null;
    }

    console.log("✅ נוצרה רשומת תמלול:", data[0]);
    return data[0];
  } catch (err) {
    console.error("❌ שגיאה כללית ביצירת רשומת תמלול:", err);
    return null;
  }
}

/**
 * 🟡 עדכון מזהה קובץ האודיו בדרייב
 * @param {string} id - מזהה רשומת התמלול בטבלה
 * @param {string} audioId - מזהה הקובץ בדרייב
 */
export async function updateAudioId(id, audioId) {
  const { error } = await supabase
    .from("transcriptions")
    .update({ audio_id: audioId, updated_at: new Date() })
    .eq("id", id);

  if (error) console.error("⚠️ שגיאה בעדכון audio_id:", error);
}

/**
 * 🔵 עדכון מזהה קובץ התמלול בדרייב
 * @param {string} id - מזהה רשומת התמלול בטבלה
 * @param {string} transcriptId - מזהה הקובץ בדרייב
 */
export async function updateTranscriptId(id, transcriptId) {
  try {
    const { data, error } = await supabase
      .from("transcriptions")
      .update({ transcript_id: transcriptId, updated_at: new Date() })
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ שגיאה בעדכון transcript_id:", error);
      return null;
    }

    console.log("✅ עודכן transcript_id ב-Supabase:", data[0]);
    return data[0];
  } catch (err) {
    console.error("❌ שגיאה כללית בעדכון transcript_id:", err);
    return null;
  }
}

/**
 * 📋 שליפת כל התמלולים של משתמש
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
 * ✏️ עדכון שם התמלול (alias)
 * @param {string} id - מזהה רשומת התמלול
 * @param {string} newAlias - שם חדש לתמלול
 */
export async function updateAlias(id, newAlias) {
  try {
    const { data, error } = await supabase
      .from("transcriptions")
      .update({ alias: newAlias, updated_at: new Date() })
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ שגיאה בעדכון שם התמלול:", error);
      return null;
    }

    console.log("✅ שם התמלול עודכן:", data[0]);
    return data[0];
  } catch (err) {
    console.error("❌ שגיאה כללית בעדכון שם התמלול:", err);
    return null;
  }
}

/**
 * 🗑️ מחיקת רשומת תמלול מה-DB
 * @param {string} id - מזהה רשומת התמלול
 */
export async function deleteTranscription(id) {
  try {
    const { error } = await supabase.from("transcriptions").delete().eq("id", id);

    if (error) {
      console.error("❌ שגיאה במחיקת תמלול מה-DB:", error);
      return false;
    }

    console.log("🗑️ נמחקה רשומת תמלול מה-DB:", id);
    return true;
  } catch (err) {
    console.error("❌ שגיאה כללית במחיקת תמלול:", err);
    return false;
  }
}
