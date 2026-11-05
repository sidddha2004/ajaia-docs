# Plan: "Ajaia Docs", a lightweight collaborative document editor

## Context
This is the Ajaia LLC take-home for the AI-Native Full Stack role, with about 4 hours remaining. The task is a small Google-Docs-like app covering:
- rich-text editing
- file upload
- sharing between users
- persistence
- a live deployment, a test, and written notes

Reviewers grade scope judgment and end-to-end working flows over feature count. The goal is one coherent slice that works reliably on a live URL, plus clear docs about what was cut.

**Decisions already made with the user**
- **Hosting:** Vercel, with free Neon Postgres. The user has GitHub and Vercel accounts; Neon can be created through the Vercel integration, which needs no extra signup.
- **Project folder:** `D:\ajaia` (this folder; scaffold the Next.js app here and init a git repo). Nothing has been built yet — start at build step 1.
- **Auth:** mocked. Three seeded users; the login screen lets you pick one, and a signed cookie keeps the session.

## Stack (and why)
| Layer | Choice | Reason |
|---|---|---|
| App | Next.js 15 (App Router) + TypeScript | One repo and one deploy that covers both UI and API |
| Editor | TipTap (StarterKit + Underline + Placeholder) | Mature editor with bold/italic/underline/headings/lists built in; content is stored as JSON |
| DB | Neon Postgres + Drizzle ORM | Free and persistent on serverless; Drizzle is light, typed, and needs no codegen step |
| Validation | zod | Shared input schemas for API routes |
| Upload parsing | `mammoth` (.docx → HTML), `marked` (.md → HTML), plain .txt | Covers the three file types the brief lists as examples |
| Sanitising | `isomorphic-dompurify` | Imported HTML could carry XSS |
| Session | `jose`-signed JWT in an httpOnly cookie | Mocked auth that still can't be forged by a reviewer |
| UI | Tailwind CSS + a few hand-rolled components | Fast and clean; no heavy UI kit |
| Tests | Vitest | Access-control unit tests plus an API-level permission test |

## Data model (`src/db/schema.ts`)
- `users(id, name, email unique, avatar_color)`. Seeded with Alice, Bob and Carol.
- `documents(id uuid, owner_id → users, title varchar(200), content jsonb, created_at, updated_at)`
- `document_shares(document_id → documents cascade, user_id → users, role 'editor'|'viewer', created_at)`, with primary key `(document_id, user_id)`.

## Access logic (the core of correctness)
`src/lib/access.ts` has one pure function: `resolveRole(userId, doc, shares) → 'owner' | 'editor' | 'viewer' | null`.

Every API route calls `requireDocAccess(docId, minRole)`, which returns 404 when there's no access (this avoids leaking that the doc exists) and 403 when the role is too low.

| Action | Minimum role |
|---|---|
| Read | viewer |
| Edit title or content | editor |
| Share, unshare, delete | owner |

The UI mirrors these rules: viewers get a read-only editor, and non-owners don't see the Share button. The server stays the source of truth.

## API routes (`src/app/api/...`)
- `POST /api/session` sets the user cookie. `DELETE /api/session` logs out.
- `GET /api/documents` returns `{ owned: [...], shared: [...] }`, with the owner name and role.
- `POST /api/documents` creates an "Untitled document".
- `GET | PATCH | DELETE /api/documents/[id]`. `PATCH` accepts `{title?, content?}`, validated with zod (title 1–200 chars, content must be a valid TipTap doc).
- `GET | POST /api/documents/[id]/shares` and `DELETE /api/documents/[id]/shares/[userId]`. `POST` takes `{email, role}` and rejects unknown emails, self-shares and duplicates (a duplicate updates the existing role instead).
- `POST /api/import` takes multipart form data. It accepts `.txt`, `.md` and `.docx` up to 2 MB, rejects anything else with a clear message, converts the file to HTML, sanitises it, and creates a new document titled after the filename.

## Pages / UX
- `/login` shows three user cards; one click logs you in. A note explains that auth is mocked for the demo.
- `/` (dashboard):
  - a header with the current user and a "switch user" control
  - a "New document" button and an "Import file" button (supported types are listed next to it)
  - tabs: **My documents** and **Shared with me**
  - each row shows the title, last edited time, owner (for shared docs) and a role badge
- `/doc/[id]` (editor):
  - an inline-editable title
  - a sticky toolbar: B / I / U, H1 / H2 / H3, paragraph, bullet list, numbered list, undo/redo
  - debounced autosave (about 800 ms) with a "Saving… / Saved / Error – retry" indicator
  - a Share dialog: email input, a role select, and the current access list with remove buttons
  - read-only mode with a banner for viewers
- Empty states, loading states and toast errors throughout.

## Build order (timeboxed, about 4 hours total)
1. **Scaffold (20 min):** `create-next-app`, Tailwind, Drizzle + Neon, the schema, `drizzle-kit push`, and a seed script.
2. **Session and login (20 min):** `src/lib/session.ts` (jose sign/verify), the login page, and middleware that redirects to `/login`.
3. **Document CRUD and dashboard (40 min):** the routes, `access.ts`, and dashboard tabs.
4. **Editor (45 min):** TipTap component, toolbar, title rename, autosave hook (`useAutosave`).
5. **Sharing (30 min):** share routes, the dialog, the viewer read-only mode, and role badges.
6. **Import (25 min):** `src/lib/import.ts` (parse + sanitise), the route, and the UI button.
7. **Tests (20 min):**
   - `access.test.ts`: owner, editor, viewer and stranger cases, plus the role-ordering matrix
   - `import.test.ts`: txt/md conversion, plus rejection of an unsupported type
   - an API test with a mocked DB: a stranger GET returns 404 and a viewer PATCH returns 403
8. **Deploy (20 min):** push to GitHub, import into Vercel, add Neon through the Vercel integration, set `SESSION_SECRET`, run the migration and seed against prod, then smoke-test with two users in two browsers.
9. **Docs (30 min):**
   - `README.md`: setup, environment variables, scripts, seeded users, supported file types
   - `ARCHITECTURE.md`: priorities, cuts, data model, access model
   - `AI_WORKFLOW.md`
   - `SUBMISSION.md`
   - `VIDEO_URL.txt`
   - screenshots

**Stretch, only if ahead of schedule:** export to Markdown (`turndown`). The editor/viewer roles already cover the "role-based sharing" stretch.

## Deliberate cuts (to state in the README and video)
- No real-time co-editing or presence indicators. Saving is last-write-wins (Yjs/websockets are out of scope for 4 hours).
- No real auth or passwords.
- No version history, comments, images or tables.
- Import supports only .txt, .md and .docx; there's no export unless stretch time allows.

## Key files
`src/db/schema.ts`, `src/db/seed.ts`, `src/lib/{session,access,import,validation}.ts`, `src/app/api/**/route.ts`, `src/components/{Editor,Toolbar,ShareDialog,ImportButton,DocList}.tsx`, `src/hooks/useAutosave.ts`, `middleware.ts`, `tests/*.test.ts`

## Verification
- `npm run test`: all Vitest suites pass.
- `npm run build` succeeds locally (this catches type errors before Vercel does).
- Manual end-to-end checks, locally and on the live URL:
  1. As Alice: create a doc, format it with every toolbar option, rename it, refresh, and confirm formatting and title persist.
  2. Import a sample .docx and .md and check that headings and lists survive. A .pdf should show a clear error.
  3. Share with Bob as viewer: in a second browser as Bob, the doc shows under "Shared with me" and is read-only, and a direct PATCH via devtools returns 403.
  4. Upgrade Bob to editor: Bob can now edit, and Alice sees the change after a refresh.
  5. As Carol: opening Alice's doc URL returns 404.
- Use the in-app browser to drive and screenshot the flows for the README.
