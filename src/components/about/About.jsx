// 📄 src/components/about/About.jsx
import React from "react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow text-right leading-relaxed">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        🎧 אודות — Tamleli Pro
      </h1>

      <p className="text-gray-700 mb-6 text-lg">
        <strong>Tamleli Pro</strong> היא מערכת ווב מתקדמת לתמלול אודיו ווידאו
        בעברית, כולל זיהוי דוברים, עריכה חיה ושמירה אוטומטית ל־Google Drive.
        המערכת מיועדת לחוקרים, מורים, סטודנטים וכל מי שזקוק לתמלול מדויק,
        מהיר ונוח לשימוש — תוך שמירה מלאה על פרטיות המשתמש.
      </p>

      {/* 🔑 התחברות */}
      <h2 className="text-xl font-semibold mt-8 mb-3">🔑 התחברות עם Google</h2>
      <p className="text-gray-700">
        ההתחברות מאפשרת יצירת קבצים בתיקייה ייעודית בדרייב שלך בלבד,
        תצוגת משתמש, וניהול גישה מאובטח. האפליקציה אינה מקבלת גישה לשום קובץ
        אחר בדרייב מלבד אלו שהיא עצמה יוצרת.
      </p>

      {/* 🗂️ תיקיית דרייב ייעודית */}
      <h2 className="text-xl font-semibold mt-8 mb-3">
        🗂️ תיקיית “Tamleli Pro” בדרייב
      </h2>
      <p className="text-gray-700 mb-3">
        בעת שימוש ראשון האפליקציה יוצרת תיקייה ייעודית בדרייב בשם:
      </p>
      <p className="text-gray-900 font-bold mb-3 text-lg">
        📁 Tamleli Pro
      </p>
      <p className="text-gray-700 mb-4">
        בתוכה נוצרת תת־תיקייה לכל תמלול, ובה מאוחסנים:
      </p>
      <ul className="list-disc pr-6 text-gray-700 mb-4">
        <li>קובץ האודיו או הווידאו המקורי</li>
        <li>קובץ התמלול (JSON) כולל היסטוריית גרסאות</li>
      </ul>

      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-800 text-sm leading-relaxed">
        ⚠️ <strong>חשוב מאוד:</strong><br />
        אין לשנות ידנית שום דבר בתוך תיקיית <strong>Tamleli Pro</strong> —
        לא שמות, לא קבצים ולא מבנה תיקיות.
        <br />
        שינוי ידני עלול לגרום לניתוק בין האפליקציה לקבצים.
        <br />
        מחיקה תתאפשר <strong>אך ורק</strong> מתוך ממשק האפליקציה.
      </div>

      {/* 🎧 תמלול */}
      <h2 className="text-xl font-semibold mt-8 mb-3">🎧 תמלול וזיהוי דוברים</h2>
      <ul className="list-disc pr-6 text-gray-700 mb-4">
        <li>תמלול אוטומטי בעברית באמצעות Whisper מבית IVRIT-AI</li>
        <li>זיהוי דוברים אוטומטי (Diarization)</li>
        <li>מעקב חי אחרי מצב התהליך: בתור, מעבד, הושלם</li>
        <li>חידוש תהליך תמלול פתוח גם לאחר יציאה מהאפליקציה</li>
      </ul>

      {/* ✏️ עריכה */}
      <h2 className="text-xl font-semibold mt-8 mb-3">✏️ עריכה ושמירה אוטומטית</h2>
      <ul className="list-disc pr-6 text-gray-700 mb-4">
        <li>נגן אודיו/וידאו מסונכרן לתמלול</li>
        <li>עריכת מילים וקטעי דיאלוג בלחיצה</li>
        <li>שמירה אוטומטית ל־Drive 1.5 שניות אחרי כל שינוי</li>
        <li>חיווי מצב שמירה: נשמר / שמירה / שינויים שלא נשמרו</li>
        <li>הורדה ל־Word, CSV ו־JSON</li>
      </ul>

      {/* 💰 יתרה */}
      <h2 className="text-xl font-semibold mt-8 mb-3">
        💰 יתרת תמלול וחישוב זמן אודיו
      </h2>
      <ul className="list-disc pr-6 text-gray-700 mb-4">
        <li>תצוגת יתרה בזמן אמת בראש המסך</li>
        <li>חישוב אוטומטי של זמן אודיו שניתן לתמלל</li>
        <li>רענון יתרה כל 30 שניות ובסיום כל תמלול</li>
        <li>תמיכה בטוקן אישי או טוקן קבוצתי</li>
      </ul>

      {/* 🫂 קבוצות */}
      <h2 className="text-xl font-semibold mt-8 mb-3">🫂 קבוצות</h2>
      <p className="text-gray-700 mb-4">
        בעל טוקן יכול לפתוח קבוצה ולהוסיף משתמשים, והם יוכלו לתמלל
        באמצעות הקרדיט שלו. חברי קבוצה יכולים לעזוב בלחיצה אחת.
      </p>

      {/* 🔒 אבטחה */}
      <h2 className="text-xl font-semibold mt-8 mb-3">🔒 אבטחת מידע</h2>
      <ul className="list-disc pr-6 text-gray-700 mb-4">
        <li>טוקנים מוצפנים ונשמרים בשרת בלבד</li>
        <li>האפליקציה אינה שומרת קבצי משתמש אצל המפתח</li>
        <li>כל קובץ מאוחסן רק בדרייב האישי של המשתמש</li>
      </ul>

      {/* 👨‍💻 אודות המפתח */}
        <div className="mt-10 p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-800 leading-relaxed text-sm">
        <strong>שלום, אני ד"ר ניצן אליקים</strong>, מרצה בכיר, חוקר ומומחה בפיתוח טכנולוגיות חינוכיות מתקדמות.
        אני מוביל את התוכנית לתואר שני <strong>"הוראה הטרוגנית - חינוך בחברה משתנה"</strong> במכללת תלפיות,
        ומלמד גם במכללת אורות ובמכללה ירושלים לחינוך.
        <br /><br />
        האפליקציה פותחה במיוחד עבור הסטודנטים שלי בקורסי המחקר לתואר שני,
        וכעת מוצעת גם לקהל הרחב – כדי להנגיש תמלול איכותי, מהיר ונוח לכל מי שזקוק לכלי זה.
        <br /><br />
        בנוסף פיתחתי את <strong>HumorizeMe</strong> – אפליקציה חדשנית ליצירת תיאורים הומוריסטיים לתמונות בעזרת בינה מלאכותית,
        המיועדת לפעילויות חברתיות וחינוכיות.
        </div>


        <div className="mt-6 text-center">
        <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSeFKwyj-dy-kSv7mmdVPUFnyLuRgBbyFp_YYkhii5tI4XGCSg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm transition"
        >
            ✉️ שליחת משוב על האפליקציה
        </a>
        </div>


        {/* 🧩 קרדיט למנועי תמלול ודוברים */}
        <div className="mt-10 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm leading-relaxed">
            אפליקציה זו עושה שימוש במודל התמלול העברי 
            <strong> IVRIT-AI Whisper </strong>
            ובמודל זיהוי הדוברים 
            <strong> PyAnnote </strong>.
            העיבוד מתבצע באמצעות תשתית 
            <strong> RunPod Serverless </strong>.
            המודלים שולבו ושונו כך שיתאימו לאפליקציה.
        </div>

      <p className="text-center text-gray-500 text-sm mt-10">
        © כל הזכויות שמורות • Tamleli Pro
      </p>
    </div>
  );
}
