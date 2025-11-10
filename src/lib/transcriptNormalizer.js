// 🧩 src/lib/transcriptNormalizer.js
// אחראי לנרמל תמלולים ממקורות שונים (RunPod, גרסאות ישנות, ערוכים, JSON מדרייב)

export function normalizeRunpodOutput(output) {
  if (!output) return [];

  // 🧠 תמיכה במבנים שונים
  // RunPod יכול להחזיר:
  // 1. { transcription: { segments: [...] } }
  // 2. { segments: [...] }
  // 3. [ { result: [[ {...}, {...} ]] } ]
  // 4. [{ text, start, end, speakers }]

  let segments = [];

  // מבנה 1
  if (output.transcription?.segments) {
    segments = output.transcription.segments;
  }
  // מבנה 2
  else if (Array.isArray(output.segments)) {
    segments = output.segments.flatMap((s) =>
      s?.result ? s.result.flat() : s
    );
  }
  // מבנה 3 (כמו אצלך ברנפוד)
  else if (Array.isArray(output) && output[0]?.result) {
    segments = output[0].result.flat();
  }
  // מבנה 4 – ישיר
  else if (Array.isArray(output)) {
    segments = output;
  }

  // הפשטת מבנה
  return segments
    .filter((s) => s?.text)
    .map((s) => ({
      speaker: s.speakers?.[0] || s.speaker || "דובר",
      text: s.text.trim(),
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
    }));
}

// 🧠 נרמול קובץ JSON מדרייב (ישן/חדש)
export function normalizeLoadedJson(json) {
  if (!json) return { segments: [] };

  // גרסה ערוכה
  if (Array.isArray(json.edited_transcript)) {
    return {
      segments: mergeConsecutiveBySpeaker(json.edited_transcript),
      audioFileId: json.audioFileId,
      mediaType: json.mediaType || "audio",
    };
  }

  // גרסה עם segments רגילים
  if (Array.isArray(json.segments) && json.segments.length > 0) {
    // האם בפנים יש מבנה מקונן (result → [[...]])
    const nested = json.segments.flatMap((s) =>
      s?.result ? s.result.flat() : s
    );
    const normalized = nested.map((s) => ({
      speaker: s.speakers?.[0] || s.speaker || "דובר",
      text: s.text?.trim() || "",
      start: s.start || 0,
      end: s.end || 0,
    }));
    return {
      segments: mergeConsecutiveBySpeaker(normalized),
      audioFileId: json.audioFileId,
      mediaType: json.mediaType || "audio",
    };
  }

  return { segments: [], audioFileId: json.audioFileId, mediaType: json.mediaType };
}

// 🧩 מיזוג דוברים רצופים (פסקאות מאוחדות)
export function mergeConsecutiveBySpeaker(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const merged = [];
  let current = { ...arr[0] };

  for (let i = 1; i < arr.length; i++) {
    const item = arr[i];
    if (item.speaker === current.speaker) {
      current.text += " " + item.text;
      current.end = item.end;
    } else {
      merged.push(current);
      current = { ...item };
    }
  }
  merged.push(current);
  return merged;
}
