# Submission: Ajaia Docs

**Candidate:** Siddharth · **Role:** AI-Native Full Stack · **Timebox:** ~4 hours

## Links

| | |
|---|---|
| **Live product** | https://ajaia-docs-five-phi.vercel.app |
| **Source code** | https://github.com/sidddha2004/ajaia-docs (also in this Drive folder) |
| **Walkthrough video** | https://drive.google.com/file/d/18iTt1gzEWCLGWSq6KE3XL9HEoyQnSvwX/view?usp=sharing (also in [`VIDEO_URL.txt`](VIDEO_URL.txt)) |
| **Google Drive folder** | _link provided with the submission_ |

## Test accounts (mocked auth: just click a user, no password)

| User | Email | Suggested use |
|---|---|---|
| Alice Johnson | `alice@ajaia.dev` | Owner: create, share, import |
| Bob Smith | `bob@ajaia.dev` | Recipient: viewer, then editor |
| Carol Davis | `carol@ajaia.dev` | Stranger: should get "Document not found" |

**Tip:** use a normal window for Alice and a private window for Bob to see both sides at once. Production starts with empty dashboards.

## What's included

| Item | Location |
|---|---|
| Source code | the repository root (`src/`, `tests/`, config files) |
| README with local setup and run instructions | [`README.md`](README.md) |
| Architecture note | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| AI workflow note | [`AI_WORKFLOW.md`](AI_WORKFLOW.md) |
| This file | [`SUBMISSION.md`](SUBMISSION.md) |
| Walkthrough video URL | [`VIDEO_URL.txt`](VIDEO_URL.txt) |
| Screenshots (8) | [`docs/screenshots/`](docs/screenshots/) |
| Sample files for import (`.docx`, `.md`, `.txt`, and a `.pdf` to show rejection) | [`samples/`](samples/) |
| Automated tests (4 suites, 44 tests) | [`tests/`](tests/) |
| Original build plan | [`PLAN.md`](PLAN.md) |

## Requirement checklist

| Requirement | Status | Where to see it |
|---|---|---|
| **Rich-text editing**: bold, italic, underline, headings, lists | ✅ Working | Editor toolbar and keyboard shortcuts |
| **File upload / import** | ✅ Working | Dashboard → *Import file* (`.txt`, `.md`, `.docx`, ≤ 2 MB) |
| **Sharing**: owner, grant access, owned vs shared distinction | ✅ Working | *Share* dialog; *My documents* / *Shared with me* tabs; role badges |
| **Persistence**: survives refresh, structure preserved, sharing demonstrable | ✅ Working | Neon Postgres; content stored as TipTap JSON |
| Clear setup and run instructions | ✅ | [README → Run it locally](README.md#run-it-locally) |
| Working deployment | ✅ | Live URL above (Vercel + Neon, free tiers) |
| Basic validation and error handling | ✅ | zod on every route; 400/401/403/404/413/415/422 responses; toasts, Retry, 404 page |
| At least one meaningful automated test | ✅ | `npm test`: 44 tests, including route-level permission tests |
| Short architecture note | ✅ | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| AI workflow note | ✅ | [`AI_WORKFLOW.md`](AI_WORKFLOW.md) |
| 3–5 minute walkthrough video | ✅ | [`VIDEO_URL.txt`](VIDEO_URL.txt) |
| No paid dependencies for reviewers | ✅ | Vercel Hobby and Neon Free only |

## What is working (end to end, verified on the live URL)

- Log in as any seeded user; switch user; log out.
- Create a document, rename it, and format it. It **autosaves** and survives a refresh.
- Share by email as **Viewer** or **Editor**; change the role; remove access.
- A viewer sees a read-only editor; the server also rejects their writes (`403`).
- A stranger gets `404`, both in the page and the API.
- Import `.docx` / `.md` / `.txt` into a new document with structure preserved; unsupported files get a clear error.
- Owners can delete documents (shares are removed with them).

## What is incomplete or deliberately out of scope

- **Real-time co-editing:** saving is **last-write-wins**; two simultaneous editors can overwrite each other.
- **Real authentication:** users are seeded and mocked, but sessions are signed and can't be forged.
- **Not built:** version history, comments, images or tables, export.
- **Small gaps:**
  - the Share dialog doesn't trap keyboard focus
  - editors can't see the access list (owner only)
  - there's no rate limiting

## What I'd build next with another 2–4 hours

1. **Overwrite protection (~45 min):** send the doc's `updated_at` with each save; the server rejects stale writes with `409` and the UI offers "reload / keep mine". This is a cheap safety net before full real-time sync.
2. **Real-time collaboration (~2–3 h):** **Yjs** (CRDT) with `@tiptap/extension-collaboration` over a WebSocket provider (for example Hocuspocus or Liveblocks), plus presence: live cursors and "who's here" avatars. **Operational Transformation** (the Google Docs approach) is the alternative; I'd pick a CRDT because TipTap supports it directly and it handles offline edits.
3. **Export to Markdown (~30 min):** convert the stored JSON to Markdown on the server and return it as a download.
4. **Polish (~30 min):** focus trap in dialogs, a read-only access list for editors, per-user rate limiting on import.

## Optional stretch

**Done:** *role-based sharing beyond basic access*. There are separate **Editor** and **Viewer** roles, owners can change them at any time, and the server enforces them on every route (with tests).

**Not done, and how I would build each:**

| Stretch item | Approach |
|---|---|
| **Real-time collaboration indicators** | A WebSocket presence channel per document (Yjs awareness, or Liveblocks/Pusher): show avatars of who's viewing, live cursors with names, and "Bob is typing…" |
| **Commenting / suggestion mode** | A `comments` table (`doc_id`, `author_id`, anchor, body, resolved). Anchor to text with a TipTap mark holding the comment ID, so the anchor moves with edits; show a sidebar thread. Suggestions would be an "insertion/deletion" mark that the owner accepts or rejects |
| **Document version history** | A `document_versions` table that snapshots the TipTap JSON on save (throttled, for example one per 5 minutes, or on explicit "Save version"). The history panel lists versions with author and time; restoring copies a version back. A diff view can compare the JSON trees |
| **Export to PDF or Markdown** | Markdown: convert the JSON to HTML with `@tiptap/html`, then to Markdown with `turndown`, and stream it as a download. PDF: render the same HTML with print styles, either through the browser's print-to-PDF or server-side with headless Chromium |

All of these build on the same access layer, so each would reuse `requireDocAccess`: for example, viewers could comment but not restore versions.

## Run locally (short version)

```bash
npm install && cp .env.example .env
npm run db:up && npm run db:push && npm run db:seed
npm run dev          # http://localhost:3000
npm test             # 44 tests
```

Full instructions: [README.md](README.md#run-it-locally).
