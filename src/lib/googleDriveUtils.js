// 📄 src/lib/googleDriveUtils.js
// ניהול תיקיות וקבצים ב-Google Drive עבור Tamleli Pro
// כולל: יצירת תיקיית-על, תתי-תיקיות לפי alias, והעלאת קבצים

/**
 * 🔍 מצא או צור את תיקיית-העל "Tamleli Pro"
 * @param {string} accessToken - אסימון גישה של המשתמש (Google OAuth)
 * @returns {Promise<string>} folderId
 */
export async function findOrCreateMainFolder(accessToken) {
  try {
    const searchQuery =
      "name='Tamleli Pro' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();

    if (data.files?.length) {
      console.log("📁 נמצא תיקיית Tamleli Pro קיימת:", data.files[0].id);
      return data.files[0].id;
    }

    // אם לא קיימת — צור חדשה
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Tamleli Pro",
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    const newFolder = await createRes.json();
    console.log("📁 נוצרה תיקיית Tamleli Pro חדשה:", newFolder.id);
    return newFolder.id;
  } catch (err) {
    console.error("❌ שגיאה בחיפוש/יצירת תיקיית Tamleli Pro:", err);
    throw err;
  }
}

/**
 * 📂 צור תת-תיקייה תחת Tamleli Pro עם שם ייחודי (alias + תאריך)
 * @param {string} accessToken - אסימון גישה
 * @param {string} parentId - מזהה תיקיית-העל
 * @param {string} alias - שם התמלול שהמשתמש בחר
 * @returns {Promise<{id: string, name: string}>}
 */
export async function createSubFolder(accessToken, parentId, alias = "") {
  try {
    const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const folderName = alias
      ? `${alias.trim()}_${timeStamp}`
      : `Transcription_${timeStamp}`;

    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    });

    const newFolder = await res.json();
    console.log("📂 נוצרה תת-תיקייה חדשה:", newFolder.id, folderName);
    return { id: newFolder.id, name: folderName };
  } catch (err) {
    console.error("❌ שגיאה ביצירת תת-תיקייה בדרייב:", err);
    throw err;
  }
}

/**
 * 📤 העלאת קובץ (אודיו/וידאו/טקסט) לתיקייה בדרייב
 * @param {string} accessToken - אסימון גישה
 * @param {string} folderId - מזהה התיקייה בדרייב
 * @param {File|Blob} file - קובץ להעלאה
 * @param {string} mimeType - סוג MIME של הקובץ
 * @returns {Promise<string>} fileId
 */
export async function uploadFileToFolder(accessToken, folderId, file, mimeType) {
  try {
    const metadata = {
      name: file.name || "unnamed",
      parents: [folderId],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ העלאה נכשלה:", text);
      throw new Error("Upload failed");
    }

    const data = await res.json();
    console.log("✅ קובץ הועלה ל-Drive:", data.id);
    return data.id;
  } catch (err) {
    console.error("❌ שגיאה בהעלאת קובץ לדרייב:", err);
    throw err;
  }
}

/**
 * 🔎 שליפת כל תתי-התקיות תחת Tamleli Pro (לשימוש עתידי במסך 'התמלולים שלי')
 * @param {string} accessToken
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listSubFolders(accessToken) {
  try {
    const mainFolderId = await findOrCreateMainFolder(accessToken);
    const query = `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,createdTime)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    console.log("📂 רשימת תיקיות בתיקיית Tamleli Pro:", data.files);
    return data.files || [];
  } catch (err) {
    console.error("❌ שגיאה בשליפת רשימת תתי-תיקיות:", err);
    return [];
  }
}

// 📄 העלאת קובץ תמלול (txt/json/docx) לתיקיית תמלול
export async function uploadTranscriptToDrive(accessToken, folderId, fileName, content, mimeType = "text/plain") {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([content], { type: mimeType }));

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ שגיאה בהעלאת קובץ תמלול ל-Drive:", data);
    throw new Error("Upload transcript failed");
  }

  console.log("✅ קובץ תמלול נשמר בדרייב:", data.id);
  return data.id;
}

