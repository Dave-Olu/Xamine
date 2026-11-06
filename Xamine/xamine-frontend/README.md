# Xamine frontend

Frontend for Xamine, an online exam platform for schools.
Built with Next.js (App Router), TypeScript and Tailwind CSS.

Xamine runs as a **service**: a school sends its questions, student names and classes, and timetable. The operator loads them, gives every student an exam number, runs the exams and delivers the results. See `Xamine_Product_Documentation_Service_Edition.docx` for the full plan and `API.md` for the backend contract.

## Status

| Milestone | Scope | State |
|---|---|---|
| 1 | Foundation, sign-in screens (login, forgot password, reset password), app shell | Done |
| 2 | Users and exams: list, create, edit, duplicate, CSV question upload | Done |
| 3 | Service edition: schools, exam numbers, student login and dashboard, timed exam, results release, date gate, demo | Done (on the mock backend) |
| 4 | Polish: phones, loading and error states, accessibility | First pass done. Error messages for failed requests wait for the real backend |
| Next | School roles and theory marking (Stage 2) | Planned |

All of this runs on a mock backend in the browser. Nothing is safe for real schools until the real backend exists.

## Screens and addresses

**Staff (the operator)** sign in at `/login` and see the sidebar.

| Address | What it does |
|---|---|
| `/dashboard` | Landing page after sign-in (still a placeholder) |
| `/schools` | List and add schools. The school code starts every exam number of that school |
| `/users` | Students and teachers: add, edit, remove, CSV import, **Generate exam numbers** |
| `/users/sheet` | Printable cut-out cards of exam numbers, per class |
| `/exams` | Exams with status. **Schedule**, **Open**, **Close**, **Change time** (open exams), **Duplicate** |
| `/exams/new`, `/exams/:id/edit` | Create or edit an exam: details, date and time, instructions, questions by CSV or by hand |
| `/results` | Per exam: who submitted, is writing, or has not taken it; class average; **Release results**; CSV and print |

The sidebar's **Acting as** menu switches between schools. Users, exams and results show only the chosen school.

**Students** need no sidebar and no email.

| Address | What it does |
|---|---|
| `/student` | Enter the exam number. **Try the demo** fills in the demo number |
| `/student/dashboard` | Name, class, timetable, exam cards with instructions, **Start exam** or **Continue exam**, and **View result** once released |
| `/student/exam/:attemptId` | The timed exam: server-based clock, autosave, resume after refresh, auto-submit at zero |
| `/student/result/:attemptId` | The score card, or "Your answers are saved" while results are hidden |

Students cannot open staff pages, and staff cannot open the student dashboard. These guards only decide what the browser shows. The backend must enforce the same rules (see `API.md`).

## Demo

- Staff: any valid email with a password of 8 or more characters signs in. The password `wrongpassword` shows the failed-login error.
- Student demo: exam number `DEMO-1234` at `/student`. It belongs to the separate **Xamine Demo School** with one always-open exam, shows the score straight away, and starts fresh at every login.
- `/reset-password?token=abc` shows the reset form. `/reset-password?token=expired` shows the expired-link error.
- The seed data also has a **Demo Secondary School** (code `DSS`) with a few students and exams for trying things out.

## Rules the mock backend enforces (the real backend should do the same)

- An exam cannot be scheduled without questions.
- An exam cannot be opened unless its class has students and every one has an exam number.
- Open and closed exams cannot be edited. The start time can still be changed while an exam is open.
- A student can start only when the exam is open and its start time has come. An exam with no date can start as soon as it is open.
- Each student gets the full duration from the moment they begin. They can resume after a refresh until time runs out.
- Results stay hidden until released, and can be released only after the exam is closed.
- Students never receive correct answers before they submit, and can reach only their own attempts.
- Generating exam numbers keeps existing numbers and only gives numbers to students who have none.

Mock data is stored in the browser (`localStorage`: `xamine.db` for data, `xamine.session` for the login, `xamine.school` for the chosen school). To reset it, clear site data in the browser.

Questions upload uses CSV (columns: question, option A to D, answer A to D). Reading Excel and Word files directly is left for the backend or a later milestone.

## Requirements

- Node.js 20 or newer (check with `node -v`)
- npm (comes with Node)

## Run it

```
npm install
npm run dev
```

Open http://localhost:3000. You land on the staff login page. Students use http://localhost:3000/student.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Type-check the project (`tsc --noEmit`) |

## Project structure

```
app/
  (auth)/              centered-card pages: login, forgot-password, reset-password,
                       student (exam number login), student/result/[attemptId]
  (app)/               staff pages behind login: dashboard, schools, users, users/sheet,
                       exams, exams/new, exams/[id]/edit, results (and placeholders)
  (student)/student/   student pages: dashboard, exam/[attemptId]
components/
  ui/                  Button, Field, Select, TextArea, Card, Alert, Table, StatusChip
  AppShell.tsx         sidebar, school picker and layout for staff pages
  ExamForm.tsx         create and edit exam form
  Logo.tsx             placeholder logo
lib/
  api/types.ts         API contract (the XamineApi interface and shared types)
  api/mock.ts          fake backend, used by default
  api/http.ts          real backend client
  api/index.ts         picks mock or http
  schoolContext.ts     which school the operator is acting as
  csv.ts, constants.ts, validation.ts
tailwind.config.ts     brand colors and fonts
```

Folder names in brackets with parentheses, such as `(auth)`, `(app)` and `(student)`, choose the layout and do **not** appear in the address. Two files cannot lead to the same address, even from different groups.

## How the API layer works

Screens never call `fetch` directly. They call the `api` object from `lib/api`, which follows the `XamineApi` interface in `lib/api/types.ts`.

- **By default** the mock backend runs in the browser, so screens can be built before the backend exists.
- **With a real backend**, create a file named `.env.local` containing:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:4000
  ```
  Restart the dev server. The app now calls the real endpoints in `lib/api/http.ts`.

The client sends `Authorization: Bearer <token>` and, when the operator has chosen a school, `X-School-Id`. The backend should honor `X-School-Id` only for the operator role.

For the backend developer: `API.md` lists every endpoint, shape, rule and error code. `lib/api/types.ts` stays the source of truth for the types. Errors should return `{ code, message, fieldErrors? }`. Every record carries a `schoolId` (multi-tenant).

## Change the look

All brand colors (purple and gold) and the font are in `tailwind.config.ts`. Edit them there and the whole app updates.

## Git setup (recommended)

```
git init
git add .
git commit -m "Xamine frontend"
```

Commit after each working change. Then create an empty repository on GitHub and run:

```
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## Troubleshooting

- **`npm install` fails:** check `node -v` is 20 or higher.
- **Port 3000 is busy:** run `npm run dev -- -p 3001`.
- **Font looks different:** the font loads from Google Fonts. Without internet it falls back to Arial.
- **Changes to `.env.local` do nothing:** restart `npm run dev`.
- **"You cannot have two parallel pages that resolve to the same path":** two `page.tsx` files lead to the same address. Delete one.
- **A blank page after changing code:** stop `npm run dev` with Ctrl+C and start it again.
- **Old data behaves oddly:** clear the site data for localhost in the browser to reset the mock.

## To do

- Replace the placeholder logo in `components/Logo.tsx` with the BLI logo.
- Connect the real backend and add clear error messages for failed requests on the staff pages.
- Build the staff dashboard (it is still a placeholder).
- Stage 2: school access codes and school admin logins, teacher accounts, theory questions and marking.
