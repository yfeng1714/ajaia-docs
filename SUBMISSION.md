# Submission

## Included

- Source in this folder, including migrations, tests, and `package-lock.json`.
- `README.md` for local setup.
- `docs/ARCHITECTURE.md`.
- `docs/AI_WORKFLOW.md`.
- Demo people listed in the README. No passwords.
- Live app: https://ajaia-docs-omega-taupe.vercel.app

## Checked

- Locally: create, rename, rich-text edit, autosave, refresh, `.txt` import, share, and a blocked third person. `npm test` passed 14 tests, covering those server rules plus the editor save-guard cases. Lint and `npm run build` passed on the submitted commit.
- On the live URL, without a Vercel login: the page loads, Alex can create and save a bold heading, reopening returns that text, Sam can open the shared document, and Lee receives "not available." Nested lists save and remain after refresh.

## Not included yet

- A walkthrough video. `docs/WALKTHROUGH_SCRIPT.md` is the four-minute script. `WALKTHROUGH_URL.txt` should be added after the recording exists.
- A Google Drive folder. Copy this repository's source archive, the README, architecture note, AI note, this file, `LIVE_URL.txt`, and the video link into that folder.

## Known limits

- Demo identities are a switcher, not accounts.
- Two people do not see each other's cursors. The second person sees edits after refresh.
- Only `.txt` import, up to 256 KB.
- If a save loses a revision race, the local text stays on screen and must be reloaded before it can be saved again.
