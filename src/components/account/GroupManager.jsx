// 📄 src/components/account/GroupManager.jsx
import React, { useEffect, useState } from "react";
import {
  getMembersForOwner,
  addMember,
  removeMember,
} from "../../lib/groupManager";

export default function GroupManager({ ownerEmail }) {
  const [members, setMembers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 🟢 טעינת רשימת החברים
  const loadMembers = async () => {
    if (!ownerEmail) return;
    const list = await getMembersForOwner(ownerEmail);
    setMembers(list);
  };

  useEffect(() => {
    loadMembers();
  }, [ownerEmail]);

  // ➕ הוספת משתמש חדש
  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setLoading(true);

    const { error } = await addMember(ownerEmail, newEmail.trim());
    setLoading(false);

    if (error) {
      alert("❌ שגיאה בהוספת משתמש: " + error.message);
    } else {
      setNewEmail("");
      await loadMembers();
    }
  };

  // 🗑️ הסרת משתמש מהרשימה
  const handleRemove = async (email) => {
    if (!window.confirm(`למחוק את ${email} מהקבוצה?`)) return;

    setLoading(true);
    const { error } = await removeMember(ownerEmail, email);
    setLoading(false);

    if (error) {
      alert("❌ שגיאה במחיקה: " + error.message);
    } else {
      await loadMembers();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800 text-right">
        🫂 ניהול משתמשים בקבוצה
      </h2>

      <p className="text-gray-600 text-sm mb-4 text-right">
        כל משתמש שתוסיף ישתמש בטוקן שלך לתמלול.
      </p>

      {/* ➕ הוספת משתמש */}
      <div className="flex gap-2 mb-6">
        <input
          type="email"
          placeholder="אימייל המשתמש"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-right"
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          ➕ הוסף
        </button>
      </div>

      {/* 📋 רשימת משתמשים */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-gray-500 text-sm text-right">
            אין משתמשים בקבוצה.
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.member_email}
              className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-lg"
            >
              <span className="text-gray-800">{m.member_email}</span>

              <button
                onClick={() => handleRemove(m.member_email)}
                className="text-red-600 hover:bg-red-200 px-2 py-1 rounded-lg"
              >
                🗑️ הסר
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
