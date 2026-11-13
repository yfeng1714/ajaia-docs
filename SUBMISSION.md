# Submission

## Included

- Source in this folder, including migrations, tests, and `package-lock.json`.
- `README.md` for local setup.
- `docs/ARCHITECTURE.md`.
- `docs/AI_WORKFLOW.md`.
- Demo people listed in the README. No passwords.

## Checked locally

- Create, rename, rich-text edit, autosave, and reopen after refresh.
- UTF-8 `.txt` import, and rejection of other extensions.
- Owner share, editor access, and a third person blocked from the document.
- Automated tests for those access and import rules.

## Not included yet

- A public live URL. Deployment is the remaining product step.
- A walkthrough video. `WALKTHROUGH_URL.txt` should be added after the recording exists.
- A Google Drive folder. The files above are the contents that folder should hold, plus the live URL and video link once they exist.

## Known limits

- Demo identities are a switcher, not accounts.
- Two people do not see each other's cursors. The second person sees edits after refresh.
- Only `.txt` import, up to 256 KB.
- If a save loses a revision race, the local text stays on screen and must be reloaded before it can be saved again.
