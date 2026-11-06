import {
  ApiError, type Attempt, type AttemptResult, type Exam, type ExamStatus,type ExamResultRow,
  type School, type Session, type SchoolUser, type XamineApi,
} from "./types";
import { getActiveSchoolId } from "../schoolContext";

// Mock implementation for building screens before the backend exists.
// Demo rules: any valid email + password works, except the password "wrongpassword",
// which fails so you can see the error state. Reset token "expired" fails too.
const KEY = "xamine.session";
const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const DB_KEY = "xamine.db";
interface Db { schools: School[]; users: SchoolUser[]; exams: Exam[]; attempts: Attempt[] }
const uid = () => Math.random().toString(36).slice(2, 10);
// No 0/O or 1/I/L, so printed numbers are hard to misread.
const NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomChunk = (n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => NUMBER_ALPHABET[b % NUMBER_ALPHABET.length]).join("");
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const mc = (text: string, options: string[], correctIndex: number) =>
  ({ id: uid(), type: "multiple_choice" as const, text, options, correctIndex });
const demoSchool = (): School => ({ id: "s1", name: "Demo Secondary School", code: "DSS", createdAt: new Date().toISOString() });

function seed(): Db {
  return {
    schools: [demoSchool()],
    users: [
      { id: "t1", schoolId: "s1", name: "Mrs. Adaeze Obi", role: "teacher", subject: "Mathematics" },
      { id: "t2", schoolId: "s1", name: "Mr. Samuel Ekpo", role: "teacher", subject: "English" },
      { id: "st1", schoolId: "s1", name: "Tunde Bello", role: "student", className: "JSS2" },
      { id: "st2", schoolId: "s1", name: "Chioma Okafor", role: "student", className: "JSS2" },
      { id: "st3", schoolId: "s1", name: "Ibrahim Musa", role: "student", className: "JSS2" },
      { id: "st4", schoolId: "s1", name: "Grace Etim", role: "student", className: "JSS2" },
      { id: "st5", schoolId: "s1", name: "Amaka Eze", role: "student", className: "SS1" },
    ],
    exams: [
      { id: "e1", schoolId: "s1", title: "Mathematics first term exam", className: "JSS2", subject: "Mathematics", durationMinutes: 60,
        attemptLimit: 1, shuffle: true, status: "scheduled", createdAt: new Date().toISOString(),
        questions: [mc("What is 12 x 8?", ["84", "96", "108", "112"], 1), mc("Solve 3x + 6 = 21", ["3", "4", "5", "6"], 2)] },
      { id: "e2", schoolId: "s1", title: "English first term exam", className: "SS1", subject: "English", durationMinutes: 90,
        attemptLimit: 1, shuffle: false, status: "draft", createdAt: new Date().toISOString(), questions: [] },
    ],
    attempts: [],
  };
}
// The public demo: a sample school, one student and one always-open exam, so anyone can try Xamine.
const DEMO_NUMBER = "DEMO-1234";
function ensureDemo(db: Db): boolean {
  let changed = false;
  if (!db.schools.some((s) => s.id === "demo")) {
    db.schools.push({ id: "demo", name: "Xamine Demo School", code: "DEMO", isDemo: true, createdAt: new Date().toISOString() });
    changed = true;
  }
  if (!db.users.some((u) => u.id === "demo-student")) {
    db.users.push({ id: "demo-student", schoolId: "demo", name: "Demo Student", role: "student", className: "JSS2", examNumber: DEMO_NUMBER });
    changed = true;
  }
  if (!db.exams.some((e) => e.id === "demo-exam")) {
    db.exams.push({
      id: "demo-exam", schoolId: "demo", title: "Demo exam: general knowledge", className: "JSS2", subject: "General",
      durationMinutes: 5, attemptLimit: 99, shuffle: true, status: "open", resultsReleased: true,
      instructions: "This is a demo. Answer the five questions, then submit to see your score.",
      createdAt: new Date().toISOString(),
      questions: [
        mc("Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Saturn"], 1),
        mc("What is 9 x 7?", ["54", "56", "63", "72"], 2),
        mc("Which of these is a prime number?", ["9", "15", "17", "21"], 2),
        mc("What is the capital of Nigeria?", ["Lagos", "Abuja", "Kano", "Port Harcourt"], 1),
        mc("At sea level, water boils at what temperature?", ["50 degrees C", "75 degrees C", "100 degrees C", "150 degrees C"], 2),
      ],
    });
    changed = true;
  }
  return changed;
}

function load(): Db {
  const raw = localStorage.getItem(DB_KEY);
  const db: Db = raw ? (JSON.parse(raw) as Db) : seed();
  db.schools ??= [demoSchool()]; // data saved before schools existed
  db.attempts ??= []; // data saved before exam taking existed
  const added = ensureDemo(db); // the public demo school is always present
  if (!raw || added) localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}
const save = (db: Db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
const notFound = (what: string) => new ApiError({ code: "NOT_FOUND", message: `${what} not found.` });
function findExam(db: Db, id: string) {
  const e = db.exams.find((x) => x.id === id);
  if (!e) throw notFound("Exam");
  return e;
}
// An exam with no date can start as soon as it is open.
const hasStarted = (e: Exam) => !e.startsAt || Date.now() >= new Date(e.startsAt).getTime();

// ---- Taking an exam ----
const shuffled = <T,>(list: T[]) => {
  const x = [...list];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
// The logged-in student, or an error. Staff cannot call the attempt methods.
function currentStudent() {
  const raw = localStorage.getItem(KEY);
  const u = raw ? (JSON.parse(raw) as Session).user : null;
  if (!u || u.role !== "student") throw new ApiError({ code: "FORBIDDEN", message: "Only students can do this." });
  return u;
}
const out = (a: Attempt): Attempt => ({ ...clone(a), serverNow: new Date().toISOString() });
// A student can only reach their own attempts.
function ownAttempt(db: Db, id: string) {
  const me = currentStudent();
  const a = db.attempts.find((x) => x.id === id && x.studentId === me.id);
  if (!a) throw notFound("Attempt");
  return a;
}
// An attempt closes by itself when its time is up.
function closeIfExpired(db: Db, a: Attempt) {
  if (!a.submittedAt && Date.now() > new Date(a.endsAt).getTime()) { a.submittedAt = a.endsAt; save(db); }
}
function grade(db: Db, a: Attempt): AttemptResult {
  const key = new Map(findExam(db, a.examId).questions.map((q) => [q.id, q.correctIndex] as const));
  let correct = 0, wrong = 0;
  for (const q of a.questions) {
    const pick = a.answers[q.id];
    if (pick === undefined) continue;
    if (pick === key.get(q.id)) correct++; else wrong++;
  }
  const total = a.questions.length;
  return {
    attemptId: a.id, examTitle: a.examTitle, total, correct, wrong,
    skipped: total - correct - wrong, percent: total ? Math.round((correct / total) * 100) : 0,
  };
}

export const mockApi: XamineApi = {
  async listSchools() { await wait(200); return clone(load().schools); },
  async createSchool(input) {
    await wait(250);
    const db = load();
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z]{2,4}$/.test(code)) {
      throw new ApiError({ code: "INVALID_SCHOOL_CODE", message: "Use 2 to 4 letters for the school code.", fieldErrors: { code: "Use 2 to 4 letters." } });
    }
    if (db.schools.some((s) => s.code === code)) {
      throw new ApiError({ code: "SCHOOL_CODE_TAKEN", message: `The code ${code} is already used by another school.`, fieldErrors: { code: "Already taken." } });
    }
    const s: School = { id: uid(), name: input.name.trim(), code, createdAt: new Date().toISOString() };
    db.schools.push(s); save(db);
    return clone(s);
  },

  async listUsers() { await wait(250); const sid = getActiveSchoolId(); return clone(load().users.filter((u) => u.schoolId === sid)); },
  async createUser(input) {
    await wait(250);
    const db = load(); const u: SchoolUser = { ...input, id: uid(), schoolId: getActiveSchoolId() };
    db.users.push(u); save(db); return clone(u);
  },
  async updateUser(id, input) {
    await wait(250);
    const db = load(); const i = db.users.findIndex((u) => u.id === id);
    if (i < 0) throw notFound("User");
    db.users[i] = { ...db.users[i], ...input }; save(db); return clone(db.users[i]);
  },
  async deleteUser(id) {
    await wait(250);
    const db = load(); db.users = db.users.filter((u) => u.id !== id); save(db);
  },
  async importUsers(rows) {
    await wait(400);
    const db = load();
    rows.forEach((r) => db.users.push({ ...r, id: uid(), schoolId: getActiveSchoolId() }));
    save(db); return { created: rows.length };
  },
  async generateExamNumbers() {
    await wait(400);
    const db = load(); const sid = getActiveSchoolId();
    const school = db.schools.find((s) => s.id === sid);
    if (!school) throw notFound("School");
    const taken = new Set(db.users.map((u) => u.examNumber));
    let created = 0;
    for (const u of db.users) {
      if (u.schoolId !== sid || u.role !== "student" || u.examNumber) continue;
      let n: string;
      do { n = `${school.code}-${randomChunk(4)}-${randomChunk(4)}`; } while (taken.has(n));
      taken.add(n); u.examNumber = n; created++;
    }
    save(db); return { created };
  },

  async listExams() { await wait(250); const sid = getActiveSchoolId(); return clone(load().exams.filter((e) => e.schoolId === sid)); },
  async getExam(id) { await wait(150); return clone(findExam(load(), id)); },
  async createExam(input) {
    await wait(350);
    const db = load();
    const e: Exam = { ...input, id: uid(), schoolId: getActiveSchoolId(), createdAt: new Date().toISOString() };
    db.exams.unshift(e); save(db); return clone(e);
  },
  async updateExam(id, input) {
    await wait(350);
    const db = load(); const e = findExam(db, id);
    if (e.status === "open" || e.status === "closed") {
      throw new ApiError({ code: "EXAM_LOCKED", message: "An open or closed exam cannot be edited." });
    }
    Object.assign(e, input); save(db); return clone(e);
  },
  async duplicateExam(id) {
    await wait(350);
    const db = load(); const src = findExam(db, id);
    const copy: Exam = { ...clone(src), id: uid(), title: `${src.title} (copy)`, status: "draft",
      createdAt: new Date().toISOString(), questions: src.questions.map((q) => ({ ...clone(q), id: uid() })) };
    db.exams.unshift(copy); save(db); return clone(copy);
  },
  async setExamStatus(id, status: ExamStatus) {
    await wait(300);
    const db = load(); const e = findExam(db, id);
    if (status === "scheduled" && e.questions.length === 0) {
      throw new ApiError({ code: "NO_QUESTIONS", message: "Add at least one question before scheduling." });
    }
    if (status === "open") {
      const students = db.users.filter((u) => u.schoolId === e.schoolId && u.role === "student" && u.className === e.className);
      if (!students.length) {
        throw new ApiError({ code: "NO_STUDENTS", message: `There are no students in ${e.className}. Add students first.` });
      }
      if (students.some((s) => !s.examNumber)) {
        throw new ApiError({ code: "MISSING_EXAM_NUMBERS", message: `Some students in ${e.className} have no exam number. Generate exam numbers on the Users page first.` });
      }
    }
    e.status = status; save(db); return clone(e);
  },
  async setExamStartTime(id, startsAt) {
    await wait(250);
    const db = load();
    const e = findExam(db, id);
    if (e.status === "closed") {
      throw new ApiError({ code: "EXAM_CLOSED", message: "A closed exam cannot be rescheduled." });
    }
    e.startsAt = startsAt; save(db);
    return clone(e);
  },
  
  async listMyExams() {
    await wait(250);
    const me = currentStudent(); const db = load();
    return clone(
      db.exams
        .filter((e) => e.schoolId === me.schoolId && e.className === me.className && e.status !== "draft")
        .map((e) => {
          const mine = db.attempts.filter((a) => a.examId === e.id && a.studentId === me.id);
          mine.forEach((a) => closeIfExpired(db, a));
          const finished = mine.filter((a) => a.submittedAt);
          return {
            id: e.id, title: e.title, subject: e.subject, className: e.className, durationMinutes: e.durationMinutes,
            startsAt: e.startsAt, instructions: e.instructions, status: e.status,
            attemptLimit: e.attemptLimit, attemptsUsed: mine.length,
            runningAttemptId: mine.find((a) => !a.submittedAt)?.id,
            lastSubmittedAttemptId: finished[finished.length - 1]?.id,
            resultsReleased: !!e.resultsReleased,
            canStart: e.status === "open" && hasStarted(e),
          };
        })
        .sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999")), // dated first, undated last
    );
  },
  async startAttempt(examId) {
    await wait(400);
    const me = currentStudent(); const db = load();
    const exam = findExam(db, examId);
    if (exam.schoolId !== me.schoolId || exam.className !== me.className) {
      throw new ApiError({ code: "FORBIDDEN", message: "This exam is not for your class." });
    }
    if (exam.status !== "open") {
      throw new ApiError({
        code: "EXAM_NOT_OPEN",
        message: exam.status === "closed" ? "This exam has closed." : "This exam is not open yet.",
      });
    }
    const mine = db.attempts.filter((a) => a.examId === exam.id && a.studentId === me.id);
    mine.forEach((a) => closeIfExpired(db, a));
    const running = mine.find((a) => !a.submittedAt);
    if (running) return out(running); // refresh or lost connection: continue where they stopped
    if (!hasStarted(exam)) {
      const when = new Date(exam.startsAt ?? "").toLocaleString();
      throw new ApiError({ code: "EXAM_NOT_STARTED", message: `This exam starts on ${when}.` });
    }
    if (mine.length >= exam.attemptLimit) {
      throw new ApiError({ code: "ATTEMPTS_USED", message: "You have used all your attempts for this exam." });
    }
    const now = new Date();
    const attempt: Attempt = {
      id: uid(), examId: exam.id, examTitle: exam.title, studentId: me.id,
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + exam.durationMinutes * 60000).toISOString(),
      serverNow: now.toISOString(),
      questions: (exam.shuffle ? shuffled(exam.questions) : exam.questions).map(({ id, type, text, options }) => ({ id, type, text, options })),
      answers: {},
    };
    db.attempts.push(attempt); save(db);
    return out(attempt);
  },
  async getAttempt(id) {
    await wait(150);
    const db = load(); const a = ownAttempt(db, id); closeIfExpired(db, a);
    return out(a);
  },
  async saveAnswer(id, questionId, choiceIndex) {
    const db = load(); const a = ownAttempt(db, id); closeIfExpired(db, a);
    if (a.submittedAt) throw new ApiError({ code: "ATTEMPT_CLOSED", message: "This exam has already been submitted." });
    a.answers[questionId] = choiceIndex; save(db);
  },
  async submitAttempt(id, answers) {
    await wait(400);
    const db = load(); const a = ownAttempt(db, id);
    if (!a.submittedAt) {
      Object.assign(a.answers, answers);
      a.submittedAt = new Date().toISOString();
      save(db);
    }
  },
    async getAttemptResult(id) {
    await wait(150);
    const db = load(); const a = ownAttempt(db, id); closeIfExpired(db, a);
    if (!a.submittedAt) throw new ApiError({ code: "NOT_SUBMITTED", message: "This exam has not been submitted yet." });
    if (!findExam(db, a.examId).resultsReleased) {
      throw new ApiError({ code: "RESULT_NOT_RELEASED", message: "Your result is not available yet." });
    }
    return grade(db, a);
  },

  async listExamResults(examId) {
    await wait(250);
    const db = load(); const exam = findExam(db, examId);
    const rows = db.users
      .filter((u) => u.schoolId === exam.schoolId && u.role === "student" && u.className === exam.className)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u): ExamResultRow => {
        const mine = db.attempts.filter((a) => a.examId === examId && a.studentId === u.id);
        mine.forEach((a) => closeIfExpired(db, a));
        const finished = mine.filter((a) => a.submittedAt);
        const last = finished[finished.length - 1]; // the latest finished attempt counts
        const base = { studentId: u.id, name: u.name, className: u.className ?? "", examNumber: u.examNumber };
        if (last) {
          const g = grade(db, last);
          return { ...base, status: "submitted", correct: g.correct, total: g.total, percent: g.percent, submittedAt: last.submittedAt };
        }
        return { ...base, status: mine.length ? "in_progress" : "not_taken" };
      });
    return clone(rows);
  },
   async setResultsReleased(examId, released) {
    await wait(250);
    const db = load();
    const e = findExam(db, examId);
    if (released && e.status !== "closed") {
      throw new ApiError({ code: "EXAM_NOT_CLOSED", message: "Close the exam before releasing results." });
    }
    e.resultsReleased = released; save(db);
    return clone(e);
  },
  async login({ email, password }) {
    await wait();
    if (password === "wrongpassword") {
      throw new ApiError({ code: "INVALID_CREDENTIALS", message: "Incorrect email or password." });
    }
    const session: Session = {
      token: "mock-token",
      user: { id: "u1", schoolId: "s1", name: "John Doe", email, role: "admin" },
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  },
  async studentLogin(rawNumber) {
    await wait(400);
    const db = load();
    const clean = (s: string) => s.toUpperCase().replace(/[\s-]/g, ""); // "dss k7r4 9pq2" works too
    const u = db.users.find((x) => x.role === "student" && x.examNumber && clean(x.examNumber) === clean(rawNumber));
    if (!u) throw new ApiError({ code: "INVALID_EXAM_NUMBER", message: "That exam number is not valid. Check it and try again." });
    if (u.id === "demo-student") { db.attempts = db.attempts.filter((a) => a.studentId !== u.id); save(db); } // every demo login starts fresh
    const session: Session = {
      token: `mock-student-${u.id}`,
      user: { id: u.id, schoolId: u.schoolId, name: u.name, role: "student", className: u.className },
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  },
  async requestPasswordReset() { await wait(); },
  async resetPassword({ token }) {
    await wait();
    if (token === "expired") {
      throw new ApiError({ code: "TOKEN_EXPIRED", message: "This reset link has expired. Request a new one." });
    }
  },
  async getSession() {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  },
  async logout() { localStorage.removeItem(KEY); },
};