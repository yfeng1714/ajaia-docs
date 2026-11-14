# AI workflow

The implementation was done in Cursor with the Grok 4.7 coding agent. Planning notes already existed in the workspace. The agent used those notes as the scope boundary and then wrote the application, tests, and this documentation.

## Where it helped

- Turning the planned data model into Drizzle tables, request handlers, and a shared permission service.
- Building the Tiptap editor, save queue, share dialog, and library screens.
- Writing the access, stale-save, and import tests, then adjusting code when the type checker and linter failed.

## What was changed or rejected

- The Next.js starter turned on Cache Components. That keeps a hidden page mounted after navigation. A document editor would keep its save timer alive in the background, so that setting was turned off.
- The starter also pulled in Tailwind. The interface uses a small custom stylesheet instead, so the Tailwind import and its loader were removed.
- Tiptap's starter kit includes links, code, and strike. Those were disabled. Underline, headings, and lists were kept. Tiptap 3 does not refresh toolbar state on each edit unless `shouldRerenderOnTransaction` is enabled; that flag was turned on after the bold button stayed visually off while the text was bold.
- The machine's existing Postgres asked for a password and Docker was not running. Rather than switching the app to SQLite, a local Postgres 18 database was created for development and tests. The app still speaks Postgres in every environment.
- A generated `AGENTS.md` inside the product was disabled. Reviewer notes stay in `README.md` and `docs/`.

## How it was checked

Implementer checks, separate from the planning notes and the later reviews:

- The first local pass recorded 7 passing tests for access, stale saves, and import rejection. That count is historical.
- After the review fixes, the suite had 14 tests for access, import, nested lists, the title-save race, in-flight navigation protection, failed identity-switch recovery, and a discarded document's late response. That count is the pre-download suite.
- The current `npm test` passes 17 tests. The three added tests cover Markdown export of formatted and nested text, escaping of literal markup, filename cleanup, and release of the temporary download link.
- `npm run lint` passed after the editor page stopped returning markup from inside a `try/catch`.
- The app was exercised in a browser: create, rename, format, refresh, share, switch person, deny an unshared person, reject a non-`.txt` file, and import a text file.
- A hosted URL is published at https://ajaia-docs-omega-taupe.vercel.app on Vercel Hobby with Neon Free. A clean request, with no Vercel cookie, loaded the app. Creating a document, saving a bold heading, reopening it, sharing it with Sam, and blocking Lee were checked against that database. Nested lists were checked again on the live app during review.

Planning and the round-1 review were separate from this implementation. The planning pass, recorded in `agent-docs/STATUS.md`, used Codex to extract requirements and write the plan. The round-1 review in `agent-docs/reviews/round1/REVIEW.md` re-ran the existing tests and build, exercised the live app, and reproduced three client defects with a source-level script. Those reviewer checks are not the same runs as the implementer's checks above. The fixes for that review are covered by the tests added with the fix.
