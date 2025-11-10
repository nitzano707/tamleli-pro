import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  getTranscriptions,
  deleteTranscription,
  updateAlias,
} from "../../lib/dbTranscriptions";

import { supabase } from "../../lib/supabaseClient"; // ✅ הוספנו את זה

import {
  deleteFileFromDrive,
  deleteFolderIfEmpty, // ✅ הוסף את זה
} from "../../lib/googleDriveUtils";


export default function TranscriptionsList({ userEmail, onOpenTranscription }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newAlias, setNewAlias] = useState("");

  // 📥 טוען תמלולים מה-Supabase
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

  const renderStatus = (r) => {
    if (r.transcript_id) return <span className="text-green-600 font-semibold">🟢 מוכן</span>;
    if (r.audio_id && !r.transcript_id)
      return <span className="text-yellow-600 font-semibold">🟡 בעיבוד</span>;
    return <span className="text-gray-500">—</span>;
  };

  const renderMediaIcon = (r) => {
    if (r.media_type === "video") return "🎥";
    return "🎧";
  };

  // ✏️ שמירת שם חדש לתמלול
  const handleAliasSave = async (id) => {
    if (!newAlias.trim()) return alert("אנא הזן שם חדש לתמלול");
    const updated = await updateAlias(id, newAlias.trim());
    if (updated) {
      alert("✅ שם התמלול עודכן בהצלחה");
      setEditingId(null);
      setNewAlias("");
      await refreshList();
    } else {
      alert("❌ עדכון נכשל");
    }
  };

  // 🗑️ מחיקת תמלול
  const handleDelete = async (record) => {
  const confirmDelete = window.confirm(
    `⚠️ האם אתה בטוח שברצונך למחוק את התמלול "${record.alias}"?\n\nהמחיקה תסיר לצמיתות את הקבצים מה-Drive ומהמערכת.`
  );

  if (!confirmDelete) return;

  try {
    const accessToken = localStorage.getItem("googleAccessToken");

    // 🗑️ מחיקת קובצי המדיה והתמלול
    if (record.audio_id)
      await deleteFileFromDrive(record.audio_id, accessToken);
    if (record.transcript_id)
      await deleteFileFromDrive(record.transcript_id, accessToken);

    // 🗑️ מחיקת התיקייה אם ריקה
    if (record.folder_id)
      await deleteFolderIfEmpty(record.folder_id, accessToken);

    // 🧹 מחיקה ממסד הנתונים
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


  if (loading)
    return <p className="text-center text-gray-600">⏳ טוען תמלולים...</p>;

  if (!records.length)
    return <p className="text-center text-gray-600">אין תמלולים להצגה כרגע.</p>;

  return (
    <div className="w-full max-w-5xl mx-auto mt-10">
      <h2 className="text-2xl font-semibold mb-4 text-right">🎧 התמלולים שלי</h2>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-right border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 border-b">מדיה</th>
              <th className="py-2 px-4 border-b">שם תמלול</th>
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
                <td className="py-2 px-4 border-b text-lg">{renderMediaIcon(r)}</td>

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
                        onClick={() => handleAliasSave(r.id)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                      >
                        💾 שמור
                      </Button>
                      <Button
                        onClick={() => setEditingId(null)}
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

                <td className="py-2 px-4 border-b text-sm text-gray-700">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString("he-IL")
                    : "—"}
                </td>

                <td className="py-2 px-4 border-b text-blue-600 underline">
                  {r.audio_id ? (
                    <a
                      href={`https://drive.google.com/file/d/${r.audio_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🎵 קובץ
                    </a>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="py-2 px-4 border-b">
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

                <td className="py-2 px-4 border-b text-center">
                  {renderStatus(r)}
                </td>

                <td className="py-2 px-4 border-b text-center flex gap-2 justify-center">
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
