// Which school the master admin is currently acting as.
const KEY = "xamine.school";
export const DEFAULT_SCHOOL_ID = "s1";

export function getActiveSchoolId(): string {
  if (typeof window === "undefined") return DEFAULT_SCHOOL_ID;
  return localStorage.getItem(KEY) ?? DEFAULT_SCHOOL_ID;
}
export function setActiveSchoolId(id: string) {
  localStorage.setItem(KEY, id);
}