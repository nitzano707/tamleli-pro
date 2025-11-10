// 📄 src/lib/googleDriveUtils.js
// ניהול תיקיות וקבצים ב-Google Drive עבור Tamleli Pro
// כולל: יצירת תיקיית-על, תתי-תיקיות לפי alias, והעלאת/עדכון קבצים עם תמיכה בגרסאות

/**
 * 🔍 מצא או צור את תיקיית-העל "Tamleli Pro"
 */
export async function findOrCreateMainFolder(accessToken) {
  if (!accessToken) throw new Error("❌ אין טוקן גישה פעיל (accessToken חסר)");

  try {
    const searchQuery =
      "name='Tamleli Pro' and mimeType='application/vnd.google-apps.folder' and trashed=false";

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        searchQuery
      )}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (res.status === 401) throw new Error("401 Unauthorized – יש להתחבר מחדש לחשבון Google");

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
 */
export async function createSubFolder(accessToken, parentId, alias = "") {
  if (!accessToken) throw new Error("❌ אין טוקן גישה פעיל");
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

    if (res.status === 401) throw new Error("401 Unauthorized – התחבר מחדש לגוגל");

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
 */
export async function uploadFileToFolder(accessToken, folderId, file, mimeType) {
  if (!accessToken) throw new Error("❌ אין טוקן גישה פעיל");
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
 * 🔎 רשימת תתי-תיקיות (לשימוש עתידי במסך 'התמלולים שלי')
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

/**
 * 🧩 העלאה או עדכון של קובץ תמלול בדרייב
 *  - אם קיים קובץ עם אותו שם באותה תיקייה → מבצע PATCH (עדכון)
 *  - אחרת → יוצר קובץ חדש (POST)
 */
export async function uploadTranscriptToDrive(
  accessToken,
  folderId,
  fileName,
  content,
  mimeType = "application/json"
) {
  if (!accessToken) throw new Error("❌ אין טוקן גישה פעיל");

  try {
    // 🔍 בדיקה אם קובץ עם אותו שם כבר קיים בתיקייה
    const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const checkRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const checkData = await checkRes.json();
    const existingFile = checkData.files?.[0];

    // הכנת גוף הבקשה
    const metadata = { name: fileName, parents: [folderId], mimeType };
    const boundary = "-------314159265358979323846";
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n` +
      content +
      `\r\n--${boundary}--`;

    // אם קובץ קיים → PATCH
    if (existingFile) {
      console.log("♻️ קובץ קיים – מבצע עדכון (PATCH):", existingFile.id);
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );
      if (!res.ok) throw new Error("עדכון קובץ תמלול נכשל");
      const updated = await res.json();
      console.log("✅ גרסה חדשה נשמרה באותו קובץ:", updated.id);
      return updated.id;
    }

    // אחרת → POST (יצירת קובץ חדש)
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ שגיאה בהעלאת קובץ תמלול ל-Drive:", text);
      throw new Error("Upload transcript failed");
    }

    const data = await res.json();
    console.log("✅ קובץ תמלול חדש נשמר בדרייב:", data.id);
    return data.id;
  } catch (err) {
    console.error("❌ שגיאה בהעלאת/עדכון קובץ תמלול בדרייב:", err);
    throw err;
  }
}


/**
 * 🗑️ מחיקת קובץ מדרייב לפי מזהה
 */
export async function deleteFileFromDrive(fileId, accessToken) {
  if (!fileId || !accessToken) return;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 204) {
      console.log(`🗑️ קובץ ${fileId} נמחק בהצלחה מדרייב`);
      return true;
    } else {
      console.warn(`⚠️ לא ניתן למחוק את הקובץ ${fileId}:`, res.status);
      return false;
    }
  } catch (err) {
    console.error("❌ שגיאה במחיקת קובץ מדרייב:", err);
    return false;
  }
}


/**
 * 🧹 בדיקה ומחיקת תת-תיקייה אם היא ריקה
 */
export async function deleteFolderIfEmpty(folderId, accessToken) {
  if (!folderId || !accessToken) return;
  try {
    // שלב 1️⃣ — בדוק אם יש קבצים בתיקייה
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const hasFiles = data.files && data.files.length > 0;

    // שלב 2️⃣ — אם אין קבצים, מחק את התיקייה עצמה
    if (!hasFiles) {
      const del = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (del.status === 204) {
        console.log(`🗑️ נמחקה תת-תיקייה ריקה: ${folderId}`);
      } else {
        console.warn(`⚠️ לא ניתן למחוק את התיקייה: ${folderId}`);
      }
    } else {
      console.log(`📁 התיקייה ${folderId} לא ריקה, לא נמחקה.`);
    }
  } catch (err) {
    console.error("❌ שגיאה בבדיקת/מחיקת תיקייה ריקה:", err);
  }
}


/**
 * ✏️ שינוי שם תיקייה בדרייב
 */
export async function renameDriveFolder(folderId, newName, accessToken) {
  if (!folderId || !newName || !accessToken) return;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      console.log(`✅ שם התיקייה בדרייב עודכן ל: ${newName}`);
      return true;
    } else {
      console.warn("⚠️ עדכון שם התיקייה נכשל:", res.status);
      return false;
    }
  } catch (err) {
    console.error("❌ שגיאה בעדכון שם התיקייה בדרייב:", err);
    return false;
  }
}
