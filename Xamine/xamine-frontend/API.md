# Xamine API contract (draft)

This is the contract the Xamine frontend expects from the backend. The source of truth in code is `lib/api/types.ts` (the `XamineApi` interface). The mock in `lib/api/mock.ts` already enforces the rules below, so it doubles as a working example. If this file and the code disagree, fix the code or this file so they match.

The frontend calls the real backend when `NEXT_PUBLIC_API_URL` is set (see `lib/api/http.ts`).

## Conventions

- **Format:** JSON requests and responses. Ids are strings. Dates are ISO 8601 in UTC (for example `2026-11-10T08:00:00.000Z`).
- **Auth:** `Authorization: Bearer <token>`. The token comes from `POST /auth/login` (staff) or `POST /auth/student-login` (students).
- **School scoping:** every record has a `schoolId`. The app sends `X-School-Id: <school id>` when the operator has chosen a school to act as. The backend must honor this header **only for the operator role**. For every other role, use the school from the token and ignore the header.
- **Errors:** on failure return `{ "code": "SOME_CODE", "message": "Safe to show to the user", "fieldErrors": { "field": "message" } }`. `fieldErrors` is optional. The frontend shows `message`, and acts on a few `code` values (marked below). HTTP statuses are suggestions.
- **Never trust the browser:** the backend must use its own clock, and check the caller's role and school on every endpoint.

## Roles

| Role value | Who | Logs in with | May call |
|---|---|---|---|
| `admin` | The operator (master admin) | Email and password | All staff endpoints |
| `student` | A student | Exam number | `/auth/me`, `/auth/logout`, `/me/exams`, `/attempts/*` |
| `teacher`, `parent` | Not used yet (Stage 2 and 3) | n/a | n/a |

A student token must be refused on every staff endpoint. A staff token must be refused on `/me/exams` and `/attempts/*`.

## Types

```ts
type Role = "admin" | "teacher" | "student" | "parent";

interface User {
  id: string;
  schoolId: string;
  name: string;
  email?: string;      // staff only
  role: Role;
  className?: string;  // students
}
interface Session { token: string; user: User }

interface School {
  id: string;
  name: string;
  code: string;        // 2 to 4 capital letters, unique; starts every exam number of the school
  createdAt: string;
  isDemo?: boolean;    // the public demo school
}

interface SchoolUser {
  id: string;
  schoolId: string;
  name: string;
  role: "teacher" | "student";
  className?: string;  // students
  subject?: string;    // teachers
  examNumber?: string; // students; set by POST /users/exam-numbers
}
type NewUser = Omit<SchoolUser, "id" | "schoolId">;

type ExamStatus = "draft" | "scheduled" | "open" | "closed";
interface Question {
  id: string;
  type: "multiple_choice" | "true_false";
  text: string;
  options: string[];       // true_false uses ["True", "False"]
  correctIndex: number;
}
interface Exam {
  id: string;
  schoolId: string;
  title: string;
  className: string;
  subject: string;
  durationMinutes: number;
  attemptLimit: number;
  shuffle: boolean;        // shuffle question order per student
  startsAt?: string;       // timetabled start (ISO)
  instructions?: string;
  resultsReleased?: boolean; // server-controlled; ignore it in create and update bodies
  status: ExamStatus;
  questions: Question[];
  createdAt: string;
}
// Body of POST /exams and PATCH /exams/:id
type ExamInput = Omit<Exam, "id" | "schoolId" | "createdAt" | "status"> & { status: "draft" | "scheduled" };
```

Student-side types. They never contain correct answers:

```ts
// GET /me/exams
interface StudentExam {
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
  runningAttemptId?: string;        // an unfinished attempt the student can continue
  lastSubmittedAttemptId?: string;  // the latest finished attempt
  resultsReleased: boolean;
  canStart: boolean;                // status is "open" AND the start time has come (server clock)
}

interface PaperQuestion { id: string; type: "multiple_choice" | "true_false"; text: string; options: string[] }
interface Attempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  startedAt: string;
  endsAt: string;                   // startedAt + duration
  serverNow: string;                // server time when this response was built
  questions: PaperQuestion[];       // shuffled if exam.shuffle; no correctIndex
  answers: Record<string, number>;  // questionId -> chosen option index
  submittedAt?: string;
}
interface AttemptResult {
  attemptId: string;
  examTitle: string;
  total: number; correct: number; wrong: number; skipped: number;
  percent: number;                  // rounded whole number
}
```

Staff results:

```ts
interface ExamResultRow {
  studentId: string;
  name: string;
  className: string;
  examNumber?: string;
  status: "submitted" | "in_progress" | "not_taken";
  correct?: number; total?: number; percent?: number; submittedAt?: string; // when submitted
}
```

## Auth

| Method and path | Body | Response | Notes |
|---|---|---|---|
| `POST /auth/login` | `{ email, password }` | `Session` | `INVALID_CREDENTIALS` (401) |
| `POST /auth/student-login` | `{ examNumber }` | `Session` | See below |
| `POST /auth/forgot-password` | `{ email }` | 204 | Always succeeds, so it never reveals which emails exist |
| `POST /auth/reset-password` | `{ token, password }` | 204 | `TOKEN_EXPIRED` |
| `GET /auth/me` | none | `Session` | 401 when not logged in. The frontend treats any failure as logged out |
| `POST /auth/logout` | none | 204 | |

**Student login.** Match the number ignoring case, spaces and hyphens (children mistype), so `dss k7r4 9pq2` finds `DSS-K7R4-9PQ2`. The returned user is `{ id, schoolId, name, role: "student", className }`. On an unknown number return `INVALID_EXAM_NUMBER` (401). **Rate-limit this endpoint and lock out repeated wrong guesses** (for example per IP and per number prefix), and return 429 with `TOO_MANY_ATTEMPTS`. The exam number is the student's only credential.

**Demo.** The demo school has the fixed number `DEMO-1234`. Every demo login must delete that student's earlier attempts, so each visitor starts fresh. In production, reset the demo school on a schedule instead, and keep it fully separate from real schools.

## Schools (operator only)

| Method and path | Body | Response | Errors |
|---|---|---|---|
| `GET /schools` | none | `School[]` | |
| `POST /schools` | `{ name, code }` | `School` | `INVALID_SCHOOL_CODE` (422, `fieldErrors.code`), `SCHOOL_CODE_TAKEN` (409, `fieldErrors.code`) |

Store the code in capital letters. It must be 2 to 4 letters, A to Z.

## Users (staff; scoped to the school)

| Method and path | Body | Response | Notes |
|---|---|---|---|
| `GET /users` | none | `SchoolUser[]` | |
| `POST /users` | `NewUser` | `SchoolUser` | |
| `PATCH /users/:id` | `NewUser` | `SchoolUser` | Merge the changes; never clear `examNumber` |
| `DELETE /users/:id` | none | 204 | |
| `POST /users/import` | `{ rows: NewUser[] }` | `{ created: number }` | The frontend parses the CSV |
| `POST /users/exam-numbers` | none | `{ created: number }` | See below |

**Generating exam numbers.** Give a number to every student of the school who has none. Never change an existing number. Format: `<school code>-XXXX-XXXX`, where each X comes from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0, O, 1, I, L). Use a cryptographically secure random source. A number must be unique across **all** schools, because students type it without naming their school.

## Exams (staff; scoped to the school)

| Method and path | Body | Response | Notes |
|---|---|---|---|
| `GET /exams` | none | `Exam[]` | |
| `GET /exams/:id` | none | `Exam` | |
| `POST /exams` | `ExamInput` | `Exam` | |
| `PATCH /exams/:id` | `ExamInput` | `Exam` | `EXAM_LOCKED` (409) when the exam is open or closed |
| `POST /exams/:id/duplicate` | none | `Exam` | The copy is a draft; give copied questions new ids |
| `POST /exams/:id/status` | `{ status }` | `Exam` | See rules below |
| `PUT /exams/:id/start-time` | `{ startsAt }` | `Exam` | Allowed unless closed: `EXAM_CLOSED` (409) |
| `GET /exams/:id/results` | none | `ExamResultRow[]` | Every student of the exam's class, sorted by name |
| `PUT /exams/:id/results-release` | `{ released: boolean }` | `Exam` | Releasing needs a closed exam: `EXAM_NOT_CLOSED` (409). Hiding is always allowed |

**Status changes.** The intended life cycle is `draft` to `scheduled` to `open` to `closed`.
- To `scheduled`: the exam needs at least one question, otherwise `NO_QUESTIONS` (422).
- To `open`: the exam's class must have at least one student (`NO_STUDENTS`, 422) and every one of them must have an exam number (`MISSING_EXAM_NUMBERS`, 422).
- Closing stops new starts. Students already writing keep their own time and can finish.

**Results rows.** For each student of the class: `submitted` (use the latest finished attempt for the score), `in_progress` (an attempt exists but is not finished), or `not_taken`.

## Student endpoints (student token only)

| Method and path | Body | Response | Notes |
|---|---|---|---|
| `GET /me/exams` | none | `StudentExam[]` | Exams of the student's school and class, never drafts, never questions. Sorted by `startsAt` (dated first) |
| `POST /attempts/start` | `{ examId }` | `Attempt` | See below |
| `GET /attempts/:id` | none | `Attempt` | Own attempt only, otherwise `NOT_FOUND`. Close it first if its time is up |
| `PUT /attempts/:id/answers` | `{ questionId, choiceIndex }` | 204 | Autosave one answer. `ATTEMPT_CLOSED` (409) after submit |
| `POST /attempts/:id/submit` | `{ answers }` | 204 | See the note on the response below |
| `GET /attempts/:id/result` | none | `AttemptResult` | See below |

**Starting an attempt**, in this order:
1. The exam must belong to the student's school and class, otherwise `FORBIDDEN`.
2. The exam must be `open`, otherwise `EXAM_NOT_OPEN` (use a "closed" message when it is closed).
3. Close any of the student's attempts whose time is up. If an unfinished attempt remains, **return it** (this is how refresh and reconnect work). It is allowed even if the start time was moved later.
4. If the exam has a `startsAt` that has not arrived on the **server clock**, return `EXAM_NOT_STARTED`. An exam with no `startsAt` can start as soon as it is open.
5. If the student has used all attempts (`attemptLimit`), return `ATTEMPTS_USED`.
6. Create the attempt: `endsAt = now + durationMinutes`. Each student gets the full duration from the moment they begin, and may enter until the exam is closed. If `shuffle` is true, shuffle the question order. Keep option order. Send `PaperQuestion`s without `correctIndex`.

**Closing by time.** An attempt is finished when `endsAt` passes, even if the student never submitted. Mark it with `submittedAt = endsAt`. Allow a short grace period (for example 30 seconds) for the final submit request after `endsAt`, so a slow connection at zero does not lose answers.

**Submit.** Merge the `answers` in the body over the stored answers (a safety net for any failed autosave), mark the attempt submitted, and grade it. Submitting twice is harmless: the second call changes nothing. **Respond with 204 and no score.** Results stay hidden until released, so the submit response must not contain the score.

**Result.** `GET /attempts/:id/result` returns the score only when the attempt is submitted (`NOT_SUBMITTED`, 409 otherwise) **and** the exam's results are released. Otherwise return `RESULT_NOT_RELEASED` (the frontend reads this code and shows "Your answers are saved"). Grade on the server: count a question as correct when the chosen index equals `correctIndex`, wrong when another option was chosen, and skipped when none was.

## Error codes

| Code | Suggested HTTP | When |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong staff email or password |
| `INVALID_EXAM_NUMBER` | 401 | Unknown exam number |
| `TOO_MANY_ATTEMPTS` | 429 | Lockout after repeated wrong exam numbers or passwords |
| `TOKEN_EXPIRED` | 400 | Password reset link expired |
| `FORBIDDEN` | 403 | Wrong role, or another class's exam. **The frontend sends the user back to the student login when it sees this** |
| `NOT_FOUND` | 404 | Record missing, or not yours |
| `INVALID_SCHOOL_CODE`, `SCHOOL_CODE_TAKEN` | 422, 409 | School code rules |
| `EXAM_LOCKED` | 409 | Editing an open or closed exam |
| `NO_QUESTIONS`, `NO_STUDENTS`, `MISSING_EXAM_NUMBERS` | 422 | Status change rules |
| `EXAM_CLOSED` | 409 | Changing the start time of a closed exam |
| `EXAM_NOT_CLOSED` | 409 | Releasing results before the exam is closed |
| `EXAM_NOT_OPEN`, `EXAM_NOT_STARTED` | 409 | Starting an attempt too early or too late |
| `ATTEMPTS_USED` | 409 | No attempts left |
| `ATTEMPT_CLOSED` | 409 | Saving an answer after submit |
| `NOT_SUBMITTED` | 409 | Reading a result before submitting |
| `RESULT_NOT_RELEASED` | 403 | Results are still hidden. **The frontend handles this code specially** |
| `UNKNOWN` | any | The frontend's fallback when a response has no body |

## Security checklist for the backend

- Role check on every endpoint. Students never reach staff endpoints, and staff never reach student ones.
- Scope every query by school. Honor `X-School-Id` only for the operator.
- Never send `correctIndex` to a student, and never send a score before results are released.
- Students can read and write only their own attempts.
- Use the server clock for `endsAt`, the start gate and closing attempts.
- Rate-limit and lock out `/auth/student-login` and `/auth/login`.
- Exam numbers are generated with a secure random source, unique across schools, and never listed to students.
- Keep the demo school isolated and reset.
- These are children's records: use HTTPS, keep backups, and agree a retention period with each school (Nigeria's NDPA applies).
