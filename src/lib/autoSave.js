// 📄 src/lib/autoSave.js
// מערכת שמירה אוטומטית עבור TranscriptPlayer

// שמירת תמלול לעריכה בדרייב
export async function autoSaveEdited({
  transcriptId,
  segments,
  mediaType = "audio",
  onSuccess = () => {},
  onError = () => {},
}) {
  try {
    const token = localStorage.getItem("googleAccessToken");
    if (!token) throw new Error("No Google access token");

    const id = transcriptId || localStorage.getItem("currentTranscriptId");
    if (!id) throw new Error("Missing transcriptId");

    // שליפת הגרסה הקודמת כדי לשמר היסטוריה
    const resPrev = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let prev = {};
    try {
      prev = await resPrev.json();
    } catch {
      prev = {};
    }

    const versionHistory = Array.isArray(prev.versionHistory)
      ? prev.versionHistory
      : [];

    versionHistory.push({
      saved_at: new Date().toISOString(),
      segments_snapshot: segments,
    });

    const edited = {
      app: "Tamleli Pro",
      schema_version: 1,
      exported_at: new Date().toISOString(),
      audioFileId: prev.audioFileId ?? null,
      mediaType,
      segments,
      edited_transcript: segments,
      versionHistory,
    };

    const metadata = {
      name: prev.name || "Tamleli_Transcript.json",
      mimeType: "application/json",
    };

    const boundary = "-------314159265358979323846";
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      JSON.stringify(edited) +
      `\r\n--${boundary}--`;

    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    onSuccess();
    return true;
  } catch (err) {
    console.error("❌ Auto-save error:", err);
    onError(err);
    return false;
  }
}
