# Architecture

Ajaia Docs is a Next.js application with Postgres. The browser edits rich text. The server decides who can read or change a document, then stores the editor document as JSON.

## Stack

- Next.js 16 and React 19 for the interface and request handlers.
- Tiptap for bold, italic, underline, headings, paragraphs, and lists. Link, code, and other marks are turned off so the saved document matches the toolbar.
- Postgres with Drizzle for users, documents, and shares. The same schema is used locally and in deployment.
- Vitest for access and import checks against a separate test database.

## Data

- `users` holds the three seeded demo people.
- `documents` stores the owner, title, Tiptap JSON, a revision number, and timestamps.
- `document_shares` stores one edit grant per person. The owner is not also stored as a share.

The active person is a server-set cookie. Document requests do not accept an owner id from the browser.

## Permissions

A person can open a document when they own it or have a share row. Renaming and changing access require ownership. A shared editor can update the body only. Everyone else receives the same not-available response, whether the document is missing or private.

## Saving

The editor waits briefly, then sends the title (owners only), the JSON body, and the revision it last loaded. Postgres updates the row only when that revision still matches, then increments it. A stale save returns HTTP 409. The browser keeps the unsaved text and asks the person to reload; it does not overwrite the newer copy.

The word Saved appears only after a successful response.

## Import

The server checks the `.txt` extension, a 256 KB limit, and UTF-8. Null bytes and invalid encodings are rejected. Lines become paragraphs. Nothing in the file is parsed as HTML.

## Deployment shape

`npm start` migrates, makes sure the demo people exist, and then starts Next.js. A hosted Postgres connection string is the only required environment variable: `DATABASE_URL`.

## What this version leaves out

There is no real-time collaboration, comments, version history, export, or public share link. Shared edits show up after the other person reopens or refreshes the document. Identity is a demo switcher, not authentication.

## Next 2–4 hours

- Revoke is already implemented; the next useful step is a short activity line showing who last saved.
- Conflict recovery could offer a side-by-side view of the saved version and the local draft.
- A second import type, such as Markdown, if the plain-text limit is too narrow for the team.
- Replace the demo switcher with real accounts only if the product moves past a reviewer demo.
