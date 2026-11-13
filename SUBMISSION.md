# Submission

## Included

- Source in this folder, including migrations, tests, and `package-lock.json`.
- `README.md` for local setup.
- `docs/ARCHITECTURE.md`.
- `docs/AI_WORKFLOW.md`.
- Demo people listed in the README. No passwords.
- Live app: https://ajaia-docs-omega-taupe.vercel.app

## Checked

- Locally: create, rename, rich-text edit, autosave, refresh, `.txt` import, share, and a blocked third person. `npm test` passed 7 tests. `npm run lint` and `npm run build` passed.
- On the live URL, without a Vercel login: the page loads, Alex can create and save a bold heading, reopening returns that text, Sam can open the shared document, and Lee receives "not available."

## Not included yet

- A walkthrough video. `WALKTHROUGH_URL.txt` should be added after the recording exists.
- A Google Drive folder. The files above are the contents that folder should hold, plus the live URL and video link once they exist.

## Known limits

- Demo identities are a switcher, not accounts.
- Two people do not see each other's cursors. The second person sees edits after refresh.
- Only `.txt` import, up to 256 KB.
- If a save loses a revision race, the local text stays on screen and must be reloaded before it can be saved again.
