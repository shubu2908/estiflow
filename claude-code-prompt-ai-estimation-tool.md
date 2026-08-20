# Build Spec: AI-Powered Automation Project Estimation Tool

> Paste this whole document into Claude Code as your starting prompt. It's written as a complete brief, not just a one-liner, so Claude Code has enough to scaffold the real architecture instead of guessing.

## 1. What we're building

A web app for an experienced RPA/automation Solution Architect. The user uploads a Solution Design Document (SDD) and/or a process flow diagram, picks a Gemini model and a few project parameters, and the app generates a realistic delivery estimate — broken into Dev, SIT, UAT, Production Deployment, and Hypercare/Support — plus User Stories with Story Points, Tasks, and Test Cases. Everything the AI generates must be manually editable afterward, and exportable.

This is an internal tool for one user (no auth needed in v1).

## 2. Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Table for editable grids
- **Backend:** Node.js + Express (TypeScript) — handles file intake, Gemini calls, export generation
- **AI:** Google Gemini API via the official Google GenAI SDK. Do NOT hardcode a single model — verify the current SDK package name and available model IDs against Google's own docs at build time (the model lineup changes often; treat anything from training data as a starting guess, not fact).
- **File parsing:** Gemini is natively multimodal — prefer sending PDFs/images directly to Gemini rather than pre-extracting text. Use `mammoth` to pull text from DOCX before sending (Gemini doesn't take DOCX directly).
- **Storage:** SQLite (via Prisma or better-sqlite3) so projects/estimates persist across refreshes. No cloud DB needed.
- **Export:** `exceljs` for Excel, `docx` npm package for Word, CSV as a lightweight fallback.

## 3. Core user flow

1. New Project → fill setup form
2. Upload SDD and/or flow diagram (PDF, DOCX, PNG/JPG — allow multiple files)
3. Pick a Gemini model from a dropdown
4. Click "Generate Estimate" → backend sends the doc(s) + a structured prompt to Gemini, gets back structured JSON
5. App shows: phase-wise estimate, timeline with buffer, user stories + tasks + story points, test cases, role-hour breakdown
6. User edits any number/date/hour inline — totals recalculate live, client-side, no re-call to Gemini needed
7. User exports whichever artifacts they need

## 4. Feature details

### 4.1 Project setup
- Project Name (text)
- Planned Dev Start Date (date picker)
- Technology — single or multi-select: UiPath, Automation Anywhere, Power Automate, Python, Other (free text)
- Optional complexity override (Simple/Medium/Complex) — default should be AI-inferred from the document, override is just an escape hatch
- Gemini model dropdown — pull from a small config array (not buried in logic) so it's a one-line edit whenever Google ships a new model. Seed it with whatever Pro/Flash/Flash-Lite tier models are current when you build this — check Google's docs rather than trusting an old list.

### 4.2 Upload & analysis
- Accept PDF, DOCX, PNG, JPG, multi-file
- Send as multimodal input to Gemini with the structured system prompt (Section 5)
- Show a real progress/loading state — this can take 10–30s

### 4.3 Estimate generation (core AI output)
Use Gemini's structured output / responseSchema so you get back reliable JSON, not prose to parse. It should contain, per phase (Requirement/Design Review, Development, SIT, UAT, Production Deployment, Hypercare/Support):
- effort in hours
- duration in working days/weeks
- dependencies
- a short rationale (so the user can sanity-check the number, not just trust it)
- an overall complexity rating (Low/Medium/High) the AI derived from the doc

### 4.4 User Stories, Tasks, Story Points
- Structure: Epics → User Stories → Tasks
- Story: title, description as a real user story ("As a..., I want..., so that..."), acceptance criteria, story points (Fibonacci: 1,2,3,5,8,13), linked phase
- Task (under a story): title, estimated hours, assigned role

### 4.5 Test Cases
- Generated per user story / acceptance criterion
- Fields: Test Case ID, linked story, title, precondition, steps, expected result, priority (High/Med/Low), type (Functional/Regression/Negative)

### 4.6 Role hours
- Configurable roles, defaulting to: Developer, Tech Lead (TL), Business Analyst (BA), QA/Tester, PM — user can add custom roles
- Hours splittable by role at the phase level and/or task level (e.g. Dev phase = 120 dev hrs + 16 TL review hrs + 8 BA hrs)
- Roll-up summary: total hours per role, per phase, and overall project total

### 4.7 Timeline & buffer — the realism requirement
This is the part to get right, so spell it out in the Gemini prompt itself, not just in app copy:
- Convert hours → working days/weeks using a configurable hours-per-productive-day assumption (default 6 hrs/day, editable)
- Apply a buffer that is deliberately realistic — not a bare-minimum "everything goes perfectly" timeline, and not padded so heavily it stops being a useful estimate. Reasonable default to start from: ~15% contingency on Dev, ~10% on SIT/UAT, plus a small fixed calendar allowance for holidays/leave/handoff delays. Make every buffer % editable per phase — don't hardcode it.
- Auto-calculate calendar start/end dates per phase from the user's chosen dev start date, respecting configurable working days (default Mon–Fri)
- Show both an editable table AND a simple Gantt-style horizontal bar view (recharts or hand-rolled SVG is enough — don't over-engineer this)

### 4.8 Manual editing
- Every generated value (hours, story points, dates, role hours, buffer %) is editable inline post-generation
- Edits recalculate dependent totals live (phase total → project total → end date) — pure client-side state, never re-calls Gemini

### 4.9 Export
- Estimate summary → Excel, with phase breakdown, role hours, timeline
- Stories & Tasks → Excel or Word
- Test Cases → Excel, standard test-case template
- Nice-to-have: one "Export All" that produces a single workbook with tabs for Estimate, Stories, Test Cases, Timeline

## 5. Prompt design for the Gemini call (bake this reasoning into the backend prompt)

Persona to give the model: *"You are a solution architect and experienced automation developer (7–10 years) with solid, real-world — not textbook-perfect — knowledge of UiPath, Automation Anywhere, Power Automate, and Python-based automation delivery. Estimate the way someone who has actually shipped projects does: realistic, not overly optimistic, not overly padded."*

Also instruct it to:
- Avoid an unrealistically tight timeline, and avoid excessive padding — state the reasoning behind the buffer it chose
- Return strict structured JSON matching the app's schema
- Factor in the selected technology and any user-supplied complexity hint
- Flag assumptions explicitly when the source document is thin or ambiguous, rather than silently guessing

## 6. Suggested data model (simplified — let Claude Code refine)

```
Project   { id, name, technology[], devStartDate, geminiModel, status, createdAt }
Phase     { id, projectId, name, hours, bufferPercent, startDate, endDate, rationale }
RoleHour  { id, phaseId | taskId, role, hours }
Story     { id, projectId, epic, title, description, acceptanceCriteria[], storyPoints, phaseId }
Task      { id, storyId, title, hours, role }
TestCase  { id, storyId, title, precondition, steps[], expectedResult, priority, type }
```

## 7. UI pages
1. **Dashboard** — list of saved projects
2. **New Project / Setup** — the form from 4.1
3. **Upload & Generate** — file upload, model dropdown, generate button, loading state
4. **Estimate Workspace** (main screen) — tabs: Overview/Timeline | Stories & Tasks | Test Cases | Role Hours, all editable and exportable from here

## 8. Non-functional
- Gemini API key lives server-side in `.env`, never sent to the frontend
- Handle Gemini errors/rate limits gracefully with a retry action
- Desktop-first is fine — this is an internal planning tool, not a mobile product
- No auth in v1 — call it out as a v2 item, don't build it now

## 9. Suggested build order
1. Scaffold repo (frontend + backend), routing, env setup
2. Project setup form + SQLite persistence
3. Upload + Gemini call returning raw estimate JSON — get this working end-to-end before styling anything
4. Estimate/timeline table with buffer logic + live-recalculating inline edits
5. Stories/Tasks generation + UI
6. Test case generation + UI
7. Role-hour breakdown + editing
8. Export (Excel/Word) for each artifact
9. Polish: loading states, error handling, Gantt view
