import { ApiError, type ApiErrorBody, type Session, type XamineApi } from "./types";

// Real implementation. Point NEXT_PUBLIC_API_URL at the NestJS backend to switch to it.
export function createHttpApi(baseUrl: string): XamineApi {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const token = typeof window === "undefined" ? null : localStorage.getItem("xamine.token");
    const school = typeof window === "undefined" ? null : localStorage.getItem("xamine.school");
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(school ? { "X-School-Id": school } : {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(body ?? { code: "UNKNOWN", message: "Something went wrong. Try again." });
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }
  const send = (method: string, path: string, body?: unknown) =>
    call<any>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const post = (path: string, body: unknown) => send("POST", path, body);

  return {
    async login(req) {
      const session = (await post("/auth/login", req)) as Session;
      localStorage.setItem("xamine.token", session.token);
      return session;
    },
    async studentLogin(examNumber) {
      const session = (await post("/auth/student-login", { examNumber })) as Session;
      localStorage.setItem("xamine.token", session.token);
      return session;
    },
    async joinSchool(req) {
      const session = (await post("/auth/join-school", req)) as Session;
      localStorage.setItem("xamine.token", session.token);
      return session;
    },
    requestPasswordReset: (req) => post("/auth/forgot-password", req) as Promise<void>,
    resetPassword: (req) => post("/auth/reset-password", req) as Promise<void>,
    async getSession() {
      try { return await call<Session>("/auth/me"); } catch { return null; }
    },
    async logout() { await post("/auth/logout", {}); localStorage.removeItem("xamine.token"); },
    listSchools: () => call("/schools"),
    createSchool: (input) => post("/schools", input),
    issueSchoolAccessCode: (schoolId) => post(`/schools/${schoolId}/access-code`, {}),
    getDashboard: () => call("/dashboard"),
    listUsers: () => call("/users"),
    createUser: (input) => post("/users", input),
    updateUser: (id, input) => send("PATCH", `/users/${id}`, input),
    deleteUser: (id) => send("DELETE", `/users/${id}`),
    importUsers: (rows) => post("/users/import", { rows }),
    generateExamNumbers: () => post("/users/exam-numbers", {}),
    createTeacherLogin: (userId) => post(`/users/${userId}/login`, {}),
    listExams: () => call("/exams"),
    getExam: (id) => call(`/exams/${id}`),
    createExam: (input) => post("/exams", input),
    updateExam: (id, input) => send("PATCH", `/exams/${id}`, input),
    duplicateExam: (id) => post(`/exams/${id}/duplicate`, {}),
    setExamStatus: (id, status) => post(`/exams/${id}/status`, { status }),
    setExamStartTime: (id, startsAt) => send("PUT", `/exams/${id}/start-time`, { startsAt }),
    listExamResults: (examId) => call(`/exams/${examId}/results`),
    setResultsReleased: (examId, released) => send("PUT", `/exams/${examId}/results-release`, { released }),
    listMyExams: () => call("/me/exams"),
    startAttempt: (examId) => post("/attempts/start", { examId }),
    getAttempt: (id) => call(`/attempts/${id}`),
    saveAnswer: (id, questionId, choiceIndex) => send("PUT", `/attempts/${id}/answers`, { questionId, choiceIndex }),
    submitAttempt: (id, answers) => post(`/attempts/${id}/submit`, { answers }),
    getAttemptResult: (id) => call(`/attempts/${id}/result`),
  };
}