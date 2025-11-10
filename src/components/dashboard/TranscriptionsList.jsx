import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { getTranscriptions } from "../../lib/dbTranscriptions";

export default function TranscriptionsList({ userEmail, onOpenTranscription }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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
              <th className="py-2 px-4 border-b">שם תמלול</th>
              <th className="py-2 px-4 border-b">תאריך יצירה</th>
              <th className="py-2 px-4 border-b">אודיו</th>
              <th className="py-2 px-4 border-b">תמלול</th>
              <th className="py-2 px-4 border-b">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50 transition-all duration-200"
              >
                <td className="py-2 px-4 border-b">{r.alias || "ללא שם"}</td>

                <td className="py-2 px-4 border-b">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString("he-IL")
                    : "—"}
                </td>

                <td className="py-2 px-4 border-b">
                  {r.audio_id ? (
                    <a
                      href={`https://drive.google.com/file/d/${r.audio_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      🎵 אודיו
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
                      📄 תמלול
                    </a>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="py-2 px-4 border-b text-center">
                  <Button
                    onClick={() => onOpenTranscription(r)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md"
                  >
                    🔍 פתח בתמלול חי
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={() => window.location.reload()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          🔄 רענן רשימה
        </Button>
      </div>
    </div>
  );
}
