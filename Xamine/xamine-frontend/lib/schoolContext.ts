// Which school the operator is currently acting as.
const KEY = "xamine.school";
export const DEFAULT_SCHOOL_ID = "s1";

export function getActiveSchoolId(): string {
  if (typeof window === "undefined") return DEFAULT_SCHOOL_ID;
  // A school admin or teacher is tied to their own school, whatever the school menu holds.
  try {
    const raw = localStorage.getItem("xamine.session");
    const user = raw ? JSON.parse(raw).user : null;
    if (user && (user.role === "school_admin" || user.role === "teacher")) return user.schoolId;
  } catch { /* a broken saved session is ignored */ }
  return localStorage.getItem(KEY) ?? DEFAULT_SCHOOL_ID;
}
export function setActiveSchoolId(id: string) {
  localStorage.setItem(KEY, id);
}