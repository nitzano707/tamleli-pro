// 📄 src/components/dashboard/TranscriptionsList.jsx
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";

import {
  getTranscriptions,
  updateAlias,
} from "../../lib/dbTranscriptions";

import { supabase } from "../../lib/supabaseClient";

import {
  deleteFileFromDrive,
  deleteFolderIfEmpty,
  // ✅ פונקציה לשינוי שם תיקייה בדרייב (ראה הערה למעלה)
  renameDriveFolder,
} from "../../lib/googleDriveUtils";

// 🎧🎬 אייקונים מודרניים
import { Headphones, Film } from "lucide-react";

export default function TranscriptionsList({ userEmail, onOpenTranscription }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newAlias, setNewAlias] = useState("");

  // 📥 טען רשימה
  useEffect(() => {
    const load = async () => {
      if (!userEmail) return;
      setLoading(true);
      const data = await getTranscriptions(userEmail);
      setRecords(data || []);
      setLoading(false);
    };
    load();
  }, [userEmail]);

  const refreshList = async () => {
    const data = await getTranscriptions(userEmail);
    setRecords(data || []);
  };

  // 🟢 סטטוס תמלול
  const renderStatus = (r) => {
    if (r.transcript_id)
      return <span className="text-green-600 font-semibold">🟢 מוכן</span>;
    if (r.audio_id && !r.transcript_id)
      return <span className="text-yellow-600 font-semibold">🟡 בעיבוד</span>;
    return <span className="text-gray-500">—</span>;
  };

  // 🎧🎬 אייקון לפי סוג מדיה (ניסיון לזהות גם לפי שם קובץ)
  const renderMediaIcon = (r) => {
    const alias = (r.alias || "").toLowerCase();
    const isVideo =
      r.media_type === "video" ||
      alias.endsWith(".mp4") ||
      alias.endsWith(".mov") ||
      alias.endsWith(".avi") ||
      alias.includes("וידאו") ||
      alias.includes("video");

    const Icon = isVideo ? Film : Headphones;
    return (
      <Icon
        size={18}
        className={isVideo ? "text-purple-600" : "text-blue-600"}
      />
    );
  };

  // ✏️ שמירת שם חדש – DB + שינוי שם התיקייה בדרייב
  const handleAliasSave = async (record) => {
    const value = newAlias?.trim();
    if (!value) {
      alert("אנא הזן שם חדש לתמלול");
      return;
    }

    try {
      // 1) עדכון שם ב-DB
      const updated = await updateAlias(record.id, value);
      if (!updated) throw new Error("DB update failed");

      // 2) שינוי שם התיקייה בדרייב (אם יש folder_id)
      const accessToken = localStorage.getItem("googleAccessToken");
      if (record.folder_id && accessToken) {
        try {
          await renameDriveFolder(accessToken, record.folder_id, value);
        } catch (e) {
          console.warn("⚠️ שינוי שם תיקייה בדרייב נכשל (נמשיך בכל זאת):", e);
        }
      }

      alert("✅ שם התמלול עודכן בהצלחה");
      setEditingId(null);
      setNewAlias("");
      await refreshList();
    } catch (err) {
      console.error("❌ עדכון שם נכשל:", err);
      alert("❌ עדכון נכשל");
    }
  };

  // 🗑️ מחיקת תמלול – קבצים + תיקייה אם ריקה + DB
  const handleDelete = async (record) => {
    const confirmDelete = window.confirm(
      `⚠️ למחוק את התמלול "${record.alias}"?\nזה ימחק לצמיתות את הקבצים מה-Drive ומהמערכת.`
    );
    if (!confirmDelete) return;

    try {
      const accessToken = localStorage.getItem("googleAccessToken");

      // קבצי מדיה/תמלול
      if (record.audio_id) {
        await deleteFileFromDrive(record.audio_id, accessToken);
      }
      if (record.transcript_id) {
        await deleteFileFromDrive(record.transcript_id, accessToken);
      }

      // מחיקת תיקייה אם ריקה
      if (record.folder_id) {
        await deleteFolderIfEmpty(record.folder_id, accessToken);
      }

      // מחיקה מה-DB
      const { error } = await supabase
        .from("transcriptions")
        .delete()
        .eq("id", record.id);
      if (error) throw error;

      alert(`✅ התמלול "${record.alias}" נמחק בהצלחה.`);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      console.error("❌ שגיאה במחיקה:", err);
      alert("❌ המחיקה נכשלה. נסה שוב מאוחר יותר.");
    }
  };

  // ⏳ טעינה / אין נתונים
  if (loading)
    return <p className="text-center text-gray-600">⏳ טוען תמלולים...</p>;

  if (!records.length)
    return <p className="text-center text-gray-600">אין תמלולים להצגה כרגע.</p>;

  return (
    <div className="w-full max-w-5xl mx-auto mt-10">
      <h2 className="text-2xl font-semibold mb-4 text-right flex items-center justify-end gap-2">
        🎧 התמלולים שלי
      </h2>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-right border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 border-b">
                שם תמלול{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (לחץ פעמיים כדי לערוך)
                </span>
              </th>
              <th className="py-2 px-4 border-b">תאריך יצירה</th>
              <th className="py-2 px-4 border-b">קובץ</th>
              <th className="py-2 px-4 border-b">תמלול</th>
              <th className="py-2 px-4 border-b">סטטוס</th>
              <th className="py-2 px-4 border-b">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50 transition-all duration-200"
              >
                {/* ✏️ שם תמלול */}
                <td className="py-2 px-4 border-b">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={r.alias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                      <Button
                        onClick={() => handleAliasSave(r)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                      >
                        💾 שמור
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setNewAlias("");
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-xs px-2 py-1"
                      >
                        ביטול
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer text-blue-700 font-medium"
                      onDoubleClick={() => setEditingId(r.id)}
                      title="לחץ פעמיים לעריכה"
                    >
                      {r.alias || "ללא שם"}
                    </div>
                  )}
                </td>

                {/* 📅 תאריך */}
                <td className="py-2 px-4 border-b text-sm text-gray-700">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString("he-IL")
                    : "—"}
                </td>

                {/* 🎵/🎬 קובץ מדיה (עם אייקון) */}
                <td className="py-2 px-4 border-b text-blue-600 underline text-center">
                  {r.audio_id ? (
                    <a
                      href={`https://drive.google.com/file/d/${r.audio_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 justify-center"
                    >
                      {renderMediaIcon(r)} קובץ
                    </a>
                  ) : (
                    "—"
                  )}
                </td>

                {/* 📄 קובץ התמלול */}
                <td className="py-2 px-4 border-b text-center">
                  {r.transcript_id ? (
                    <a
                      href={`https://drive.google.com/file/d/${r.transcript_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 underline"
                    >
                      📄 פתיחת תמלול
                    </a>
                  ) : (
                    "—"
                  )}
                </td>

                {/* 🔵 סטטוס */}
                <td className="py-2 px-4 border-b text-center">
                  {renderStatus(r)}
                </td>

                {/* ⚙️ פעולות */}
                <td className="py-2 px-4 border-b text-center">
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => onOpenTranscription(r)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                    >
                      🔍 פתח
                    </Button>
                    <Button
                      onClick={() => handleDelete(r)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1"
                    >
                      🗑️ מחק
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={refreshList}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          🔄 רענן רשימה
        </Button>
      </div>
    </div>
  );
}
