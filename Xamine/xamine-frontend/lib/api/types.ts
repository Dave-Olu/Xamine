// API CONTRACT (draft). The backend developer implements these shapes.
// Every screen talks to the `XamineApi` interface in this file, never to fetch directly.

export type Role = "admin" | "school_admin" | "teacher" | "student" | "parent";

export interface User {
  id: string;
  schoolId: string; // multi-tenant: every record belongs to a school
  name: string;
  email?: string; // staff only; students log in with an exam number
  role: Role;
  className?: string; // students
}

export interface Session {
  token: string;
  user: User;
}

export interface LoginRequest { email: string; password: string }
export interface ForgotPasswordRequest { email: string }
export interface ResetPasswordRequest { token: string; password: string }

// Error shape every endpoint should return on failure.
export interface ApiErrorBody {
  code: string; // e.g. "INVALID_CREDENTIALS", "TOKEN_EXPIRED"
  message: string; // safe to show to the user
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  code: string;
  fieldErrors?: Record<string, string>;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
  }
}

// ---------- Users and exams ----------
export type ListedRole = "teacher" | "student";
export interface SchoolUser {
  id: string;
  schoolId: string;
  name: string;
  role: ListedRole;
  className?: string; // students
  subject?: string; // teachers
  examNumber?: string; // students: their login number, e.g. FCS-K7R4-9PQ2
  email?: string; // teachers: used for their login
  hasLogin?: boolean; // teachers: set by the server when listing
}
export type NewUser = Omit<SchoolUser, "id" | "schoolId" | "hasLogin">;

// Exam life cycle: draft -> scheduled -> open -> closed.
export type ExamStatus = "draft" | "scheduled" | "open" | "closed";
export type QuestionType = "multiple_choice" | "true_false";
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[]; // true_false uses ["True", "False"]
  correctIndex: number;
}
export interface Exam {
  id: string;
  schoolId: string;
  title: string;
  className: string;
  subject: string;
  durationMinutes: number;
  attemptLimit: number;
  shuffle: boolean;
  startsAt?: string; // ISO date-time the exam is timetabled for
  instructions?: string; // shown to students before they start
  resultsReleased?: boolean; // students see their score only after staff release it
  createdBy?: string; // the staff user who created it (teachers see only their own exams)
  status: ExamStatus;
  questions: Question[];
  createdAt: string; // ISO date
}
export type ExamInput = Omit<Exam, "id" | "schoolId" | "createdAt" | "status" | "createdBy" | "resultsReleased"> & { status: "draft" | "scheduled" };

export interface XamineApi {
  // POST /auth/login
  login(req: LoginRequest): Promise<Session>;
  // POST /auth/student-login  body: { examNumber }  (the backend must rate-limit and lock out repeated wrong guesses)
  studentLogin(examNumber: string): Promise<Session>;
  // POST /auth/join-school  (public; a one-time access code creates the school admin's login)
  joinSchool(req: JoinSchoolRequest): Promise<Session>;
  // POST /auth/forgot-password  (always succeeds, to avoid revealing which emails exist)
  requestPasswordReset(req: ForgotPasswordRequest): Promise<void>;
  // POST /auth/reset-password
  resetPassword(req: ResetPasswordRequest): Promise<void>;
  // GET /auth/me  (null when not logged in)
  getSession(): Promise<Session | null>;
  // POST /auth/logout
  logout(): Promise<void>;

  // GET /schools  (the operator sees all schools, other staff see only their own)
  listSchools(): Promise<School[]>;
  // POST /schools  (operator only; rejects a code that is already taken)
  createSchool(input: NewSchool): Promise<School>;
  // POST /schools/:id/access-code  (operator only; a new code replaces an unused one; the code is shown once)
  issueSchoolAccessCode(schoolId: string): Promise<{ code: string }>;

  // GET /dashboard  (the operator gets totals for every school, a school admin their school, a teacher their own exams)
  getDashboard(): Promise<DashboardSummary>;

  // GET /users  (not for teachers)
  listUsers(): Promise<SchoolUser[]>;
  // POST /users
  createUser(input: NewUser): Promise<SchoolUser>;
  // PATCH /users/:id
  updateUser(id: string, input: NewUser): Promise<SchoolUser>;
  // DELETE /users/:id  (also removes a teacher's login)
  deleteUser(id: string): Promise<void>;
  // POST /users/import  (bulk create; the frontend parses the CSV)
  importUsers(rows: NewUser[]): Promise<{ created: number }>;
  // POST /users/exam-numbers  (gives a number to every student of the school who has none)
  generateExamNumbers(): Promise<{ created: number }>;
  // POST /users/:id/login  (creates a teacher's login; the temporary password is shown once)
  createTeacherLogin(userId: string): Promise<{ email: string; tempPassword: string }>;

  // GET /exams  (teachers see only the exams they created)
  listExams(): Promise<Exam[]>;
  // GET /exams/:id
  getExam(id: string): Promise<Exam>;
  // POST /exams
  createExam(input: ExamInput): Promise<Exam>;
  // PATCH /exams/:id  (rejected with EXAM_LOCKED once the exam is open or closed)
  updateExam(id: string, input: ExamInput): Promise<Exam>;
  // POST /exams/:id/duplicate  (copy becomes a draft)
  duplicateExam(id: string): Promise<Exam>;
  // POST /exams/:id/status  body: { status }  (opening needs students who all have exam numbers; teachers may not open or close)
  setExamStatus(id: string, status: ExamStatus): Promise<Exam>;
  // PUT /exams/:id/start-time  body: { startsAt }  (not allowed once the exam is closed; not for teachers)
  setExamStartTime(id: string, startsAt: string): Promise<Exam>;
  // GET /exams/:id/results  (every student of the exam's class with their status and score)
  listExamResults(examId: string): Promise<ExamResultRow[]>;
  // PUT /exams/:id/results-release  body: { released }  (needs a closed exam; not for teachers)
  setResultsReleased(examId: string, released: boolean): Promise<Exam>;

  // GET /me/exams  (student session only: exams for the student's class, never drafts, never questions)
  listMyExams(): Promise<StudentExam[]>;
  // POST /attempts/start  body: { examId }  (student session; starts, or resumes an unfinished attempt)
  startAttempt(examId: string): Promise<Attempt>;
  // GET /attempts/:id  (the student's own attempt only)
  getAttempt(id: string): Promise<Attempt>;
  // PUT /attempts/:id/answers  body: { questionId, choiceIndex }  (autosave one answer)
  saveAnswer(id: string, questionId: string, choiceIndex: number): Promise<void>;
  // POST /attempts/:id/submit  body: { answers }  (resends all answers so one failed autosave loses nothing; returns no score)
  submitAttempt(id: string, answers: Record<string, number>): Promise<void>;
  // GET /attempts/:id/result  (only after submit, and only once results are released)
  getAttemptResult(id: string): Promise<AttemptResult>;
}

// ---------- Schools and access codes ----------
export type AccessCodeStatus = "none" | "issued" | "used";
export interface School {
  id: string;
  name: string;
  code: string; // 2-4 letters, becomes the start of every student exam number, e.g. "FCS"
  createdAt: string; // ISO date
  isDemo?: boolean; // the public demo school
  accessCodeStatus?: AccessCodeStatus; // shown in the operator's list
}
export type NewSchool = Pick<School, "name" | "code">;
export interface JoinSchoolRequest { accessCode: string; name: string; email: string; password: string }

// ---------- Student side ----------
// What a student may see about an exam. Never includes questions or answers.
export interface StudentExam {
  id: string;
  title: string;
  subject: string;
  className: string;
  durationMinutes: number;
  startsAt?: string;
  instructions?: string;
  status: ExamStatus;
  attemptLimit: number;
  attemptsUsed: number;
  runningAttemptId?: string; // an unfinished attempt the student can continue
  lastSubmittedAttemptId?: string; // the latest finished attempt
  resultsReleased: boolean; // may the student see their score yet?
  canStart: boolean; // open AND the start time has arrived (decided by the server clock)
}
// A question as the student sees it. No correctIndex: correct answers never leave the server before submit.
export interface PaperQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
}
export interface Attempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  startedAt: string; // ISO
  endsAt: string; // ISO, startedAt + exam duration
  serverNow: string; // ISO, server clock when sent (the timer ignores a wrong device clock)
  questions: PaperQuestion[]; // already shuffled when exam.shuffle is true
  answers: Record<string, number>; // questionId -> chosen option index
  submittedAt?: string;
}
export interface AttemptResult {
  attemptId: string;
  examTitle: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  percent: number;
}

// ---------- Staff: results ----------
export type ExamResultStatus = "submitted" | "in_progress" | "not_taken";
export interface ExamResultRow {
  studentId: string;
  name: string;
  className: string;
  examNumber?: string;
  status: ExamResultStatus;
  correct?: number;
  total?: number;
  percent?: number;
  submittedAt?: string;
}

// ---------- Role-specific dashboards ----------
export interface DashboardExam {
  id: string;
  title: string;
  className: string;
  subject: string;
  startsAt?: string;
  status: ExamStatus;
  schoolName?: string;
}
export interface DashboardSchoolRow {
  id: string;
  name: string;
  code: string;
  students: number;
  exams: number;
  openExams: number;
  adminStatus: AccessCodeStatus;
}
export interface DashboardSummary {
  scope: "all" | "school" | "mine"; // operator: every school; school admin: their school; teacher: their own exams
  schoolName?: string; // when scope is "school" or "mine"
  schools: number;
  students: number;
  exams: number;
  openExams: number;
  submitted: number; // finished attempts
  upcoming: DashboardExam[]; // open and scheduled exams, soonest first (at most 5)
  schoolRows?: DashboardSchoolRow[]; // operator only
}