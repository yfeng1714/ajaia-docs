# Walkthrough script

About four minutes. Record in your own voice on the live app: https://ajaia-docs-omega-taupe.vercel.app

Demo people, no passwords: Alex Morgan, Sam Patel, and Lee Chen.

## 0:00–0:25 — What this is

Say this is a small shared document editor, not a full Google Docs clone. Point at the header: three seeded people, public demo, no password. You are starting as Alex.

## 0:25–1:30 — Create, format, save, refresh, import

Click New document. Rename it. Use the toolbar for a heading, bold, italic, underline, and a bullet list. Indent one bullet with Tab. Wait until the status says Saved, then refresh and show the formatting is still there.

Click Import .txt and choose `examples/meeting-notes.txt`, or any small UTF-8 text file. Mention that only `.txt` files up to 256 KB are accepted, and that text is kept as typed.

## 1:30–2:30 — Share and the access boundary

Open Share and give Sam Patel access. Switch to Sam. Show the document under Shared with me, edit a line, and wait for Saved. Switch back to Alex, refresh, and show Sam's text.

Switch to Lee and open the same document link, or stay on it. Lee sees that the document is not available.

## 2:30–3:15 — Decisions and what was left out

Say the app is Next.js with Postgres on Neon, deployed on Vercel. The server stores editor JSON and checks ownership. A save only lands if it still matches the stored revision, so two tabs cannot silently overwrite each other.

Say what is intentionally missing: no real accounts, no live cursors, no comments, no version history, and no export. Shared edits show up after refresh.

## 3:15–4:00 — AI use and checks

Say Cursor with Grok wrote the implementation, and the planning and review notes were a separate pass. Mention you ran the automated tests, lint, and production build, and checked the live URL without a Vercel login.

End with the next useful step if you had a few more hours: clearer recovery when two people save the same revision, not more editor features.

The recording link is not created yet. After you upload it, put the URL in `WALKTHROUGH_URL.txt`.
