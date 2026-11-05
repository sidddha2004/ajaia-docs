# AI workflow note

> The goal was *practical* AI use: let it do the typing and the tedious checking, and keep the product decisions and the final judgment with me.

## Tools used

| Tool | Used for |
|---|---|
| **Claude Code** (Claude Opus, in the Claude desktop app) | Planning, implementation, writing tests, debugging, driving the browser for UI checks, deployment commands, docs |
| **Claude's in-app browser + headless Edge (Playwright)** | Clicking through real UI flows and capturing the README screenshots |
| **Vercel CLI / Neon (via Vercel Marketplace)** | Provisioning and deploying, run by the agent with my approval at each outward-facing step |

## How I worked with it

1. **Plan first.** Before any code, I wrote [`PLAN.md`](PLAN.md) with the AI: stack, data model, access rules, a **timeboxed build order** (9 steps), deliberate cuts, and a verification checklist. I made the key calls myself: Vercel + Neon, mocked auth, and what to cut.
2. **One step at a time, verified before moving on.** Each step ended with typecheck + lint + production build, a check through the API and the browser, and a commit. I reviewed each step's summary and said "commit and continue". There was no long autonomous run.
3. **Humans own the outward-facing actions.** I created the GitHub repo, approved the Vercel and Neon setup, and confirmed destructive actions such as cleaning production data.

## Where AI materially sped things up

- **Scaffolding and repetitive code:** route handlers, zod schemas, Drizzle queries, and Tailwind components went from intent to working code in minutes.
- **Writing the test suites:** 44 tests, including a fake of the database layer so the real route handlers could be tested without Postgres.
- **Exhaustive permission checks:** it wrote `curl` scripts checking every role against every action (17–18 checks per step) and re-ran them against production. Doing that by hand would have taken longer than building the feature.
- **Debugging unfamiliar runtime issues:** it read Vercel's function logs, found `ERR_REQUIRE_ESM`, and traced it to `jsdom`'s dependency chain.
- **Docs and screenshots:** it scripted the screenshots so they're reproducible.

## What AI output I changed or rejected

| What the AI produced | What was wrong | What we did |
|---|---|---|
| Enter-in-title → `editor.commands.focus()` | Focus waited for the next animation frame, so the next keystrokes landed in the **title**; found by driving the real UI | Focus the editor immediately, then position the cursor |
| Dashboard `loading.tsx` at the app root | Forced the doc page to stream, so **"not found" returned HTTP 200 instead of 404** | Moved the dashboard into its own `(dashboard)` route group; the 404 is now real |
| `.docx` import via mammoth's defaults | **Underline was silently dropped** | Added a style mapping; there's now a test for it |
| DOMPurify on `jsdom` for sanitising | Worked locally, **500 on Vercel** | Replaced with `sanitize-html` and let Next bundle the ES-module dependencies |
| First fix for that crash: pin Node 24 | **Wrong hypothesis**: Vercel already ran Node 26; the problem was Vercel's module loader | Kept the harmless pin and recorded the wrong guess honestly in the commit history |
| An XSS test regex | Was too broad: it flagged the *harmless* link text as a failure | Rewrote it to assert the **link mark** is gone while the text remains |
| Wiring up "the Neon database" after I said it was added | The agent checked first: the only Neon DB on the account belonged to **another project** (`secureai-api`), and pushing this schema there could have clobbered its `users` table | It stopped and asked instead of connecting it; I chose a **new, dedicated** database |

## How I verified correctness, UX quality and reliability

**Correctness**
- **44 automated tests** (Vitest): role matrix, session tampering (including `alg: none`), import conversion and XSS stripping, and route-level permissions.
- **Checking the tests catch bugs:** we deliberately weakened the PATCH permission and confirmed the suite **failed**, then restored the code.
- **API permission checks** after every backend step: stranger → 404, viewer write → 403, editor share/delete → 403, invalid input → 400.

**UX quality**
- Drove the real UI in a browser for every feature: formatting → reload → persisted; Bob's view-only mode; the save-error → Retry path (downgrading Bob mid-edit); the import error toast.
- Reviewed the screenshots myself and fixed what looked wrong (leftover test text, a toast caught too early).

**Reliability**
- `tsc --noEmit`, `eslint` and `next build` before every commit.
- **Production smoke test** on the live URL, which caught the import crash that local testing could not.
- Imports re-tested against a local **production build** (`next start`), not just the dev server.

## What I'd do differently with more time

AI makes it tempting to add features quickly. With four hours, I used that speed for **verification**, not scope. With more time I'd use the same loop to build real-time collaboration (Yjs over WebSockets), with AI-generated concurrency tests that simulate two editors at once.
