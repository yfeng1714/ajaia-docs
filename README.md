# Ajaia Docs

A small shared document editor. A reviewer can pick one of three demo people, create or import a document, edit rich text, and share it with another demo person.

## Demo people

There is no password. Choose a person in the header. Anyone with the app can switch identities; this is a public demo, not an account system.

| Person | Email |
| --- | --- |
| Alex Morgan | alex@demo.ajaia.test |
| Sam Patel | sam@demo.ajaia.test |
| Lee Chen | lee@demo.ajaia.test |

The owner can rename a document and choose who else can edit it. A person with access can edit the text. Anyone else who opens the link is told the document is not available.

## What you can import

UTF-8 `.txt` files up to 256 KB. The file becomes a new document owned by the current person. Line breaks become paragraphs. The text is kept as typed, including characters that look like HTML. Other file types are rejected.

## Local setup

Requirements: Node.js 22 or newer, and Postgres 16 or newer.

1. Install dependencies.

```bash
npm install
```

2. Start Postgres and create two databases. Docker is one way:

```bash
docker compose up -d
```

That starts Postgres on port 5433 with user `ajaia`, password `ajaia`, database `ajaia_docs`, and also creates `ajaia_docs_test`.

3. Create the local environment file. These values match the Docker Compose defaults above.

```bash
cp .env.example .env
```

Edit `.env` only when your database host, port, user, or password differ. A hosted process can set `DATABASE_URL` in the environment instead of using this file. `npm run db:setup` uses `DATABASE_URL_UNPOOLED` when that variable is present, and otherwise `DATABASE_URL`.

4. Create the tables and demo people.

```bash
npm run db:setup
```

5. Start the app.

```bash
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm test
npm run lint
npm run build
```

`npm test` uses a database named `ajaia_docs_test`. Override the connection with `TEST_DATABASE_URL` if it is not on `127.0.0.1:5433`. The tests refuse to run against any other database name.

`npm start` migrates and seeds, then serves the production build. Run `npm run build` first.

## Sharing rules

- Documents you own are listed under **Owned by you**.
- Documents another person shared with you are listed under **Shared with me**.
- Saves are acknowledged only after Postgres stores them.
- If someone else saves the same document first, your copy stays on screen and the page tells you to reload before those edits can be saved.

## Live app

https://ajaia-docs-omega-taupe.vercel.app

Source: https://github.com/yfeng1714/ajaia-docs

Pushes to `main` deploy this Vercel project. The hosted app uses Vercel Hobby and Neon Free. No Vercel login is required. The same three demo people work there. A document named "Live check" was created while verifying the deployment; Alex owns it and Sam can edit it.
