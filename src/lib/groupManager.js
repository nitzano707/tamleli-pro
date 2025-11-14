// 📄 src/lib/groupManager.js
// מודול עזר לניהול קבוצות (שיתוף טוקן של Owner עם חברי קבוצה)

import { supabase } from "./supabaseClient";

/**
 * 🧑‍🤝‍🧑 בדיקה האם משתמש הוא חבר בקבוצה של Owner כלשהו
 * מחזיר:
 *  - אובייקט הרשומה מטבלת group_members אם כן
 *  - null אם לא מצאנו קבוצה פעילה
 */
export async function getGroupForMember(memberEmail) {
  if (!memberEmail) return null;

  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("member_email", memberEmail)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("⚠️ getGroupForMember – שגיאה בשליפת קבוצה לחבר:", error);
    return null;
  }

  return data;
}

/**
 * 📋 משיכת כל החברים בקבוצה של Owner
 */
export async function getMembersForOwner(ownerEmail) {
  if (!ownerEmail) return [];

  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("owner_email", ownerEmail)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("⚠️ getMembersForOwner – שגיאה בשליפת חברים:", error);
    return [];
  }

  return data || [];
}

/**
 * ➕ הוספת חבר חדש לקבוצה
 */
export async function addMember(ownerEmail, memberEmail) {
  if (!ownerEmail || !memberEmail) {
    return { error: new Error("ownerEmail או memberEmail ריקים") };
  }

  const { data, error } = await supabase.from("group_members").insert({
    owner_email: ownerEmail,
    member_email: memberEmail,
    active: true,
  });

  if (error) {
    console.error("⚠️ addMember – שגיאה בהוספת חבר:", error);
  }

  return { data, error };
}

/**
 * 🗑️ הסרת חבר מקבוצה (ע"י ה־Owner)
 */
export async function removeMember(ownerEmail, memberEmail) {
  if (!ownerEmail || !memberEmail) {
    return { error: new Error("ownerEmail או memberEmail ריקים") };
  }

  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .match({ owner_email: ownerEmail, member_email: memberEmail });

  if (error) {
    console.error("⚠️ removeMember – שגיאה במחיקת חבר:", error);
  }

  return { data, error };
}

/**
 * 🚪 עזיבת קבוצה ע"י החבר עצמו
 */
export async function leaveGroup(memberEmail) {
  if (!memberEmail) {
    return { error: new Error("memberEmail ריק") };
  }

  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("member_email", memberEmail);

  if (error) {
    console.error("⚠️ leaveGroup – שגיאה בעזיבת קבוצה:", error);
  }

  return { data, error };
}
