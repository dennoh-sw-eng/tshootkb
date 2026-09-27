# T-Shoot Knowledge Base

A private IT documentation, SOP and troubleshooting vault. Built to be used
by one technician from day one, with a straight, no-rewrite path to a
role-based, multi-user team tool later.

## Stack

- **Next.js 14** (App Router, TypeScript) — UI + API routes
- **Prisma** + **Postgres** (Supabase's free tier works well — see
  "Deploying for free" below; any Postgres host works)
- **NextAuth** (credentials provider, JWT sessions, bcrypt password hashing)
- **Tailwind CSS** for styling
- **Supabase Storage** for file attachments (screenshots, PDFs)

## What's implemented

- Owner-first setup: the very first person to open the app creates the
  Global Admin / Owner account. No invite step required to get started.
- Role-based access control (Global Admin, Senior Technician, Mid-Level
  Technician, Intern, Viewer), enforced **server-side** in every API route
  (`src/lib/rbac.ts`) — the frontend hides buttons for usability, but the
  backend is the actual authority.
- Article + step builder: create SOPs, Troubleshooting Guides, Quick
  Fixes, Commands, Checklists, and Known Issues. Steps support TEXT,
  COMMAND (with copy button and shell label), WARNING, NOTE, SCREENSHOT
  (image upload), CHECKPOINT, DECISION (simple yes/no branching), and LINK.
  Steps can be added, edited, deleted, duplicated, inserted between existing
  steps, and reordered (up/down controls — see "Known simplifications"
  below on drag-and-drop).
- Draft → In Review → Published → Archived workflow, with permanent
  deletion restricted to Global Admin and requiring a typed "DELETE"
  confirmation. Everything else uses Archive, which is reversible.
- Full version history: every publish and every edit to a published
  article snapshots the previous content. Versions can be viewed and
  restored; restoring creates a new version rather than deleting anything.
- Visibility classification per article (Team / Technicians / Senior Tech
  Only / Admin Only / Private / Sensitive), enforced in search and in
  direct-link access — restricted articles return "not found" rather than
  confirming they exist to users without access.
- Search across title, description, step content, commands, tags, category
  and author name, with filters for category and status.
- Favorites, comments, and an audit log of key actions (logins, article
  lifecycle events, permission and role changes, category changes),
  visible to Global Admins.
- Configurable categories and tags — not hard-coded, managed from
  Administration → Categories.
- Seed script with demo/sample knowledge articles, clearly marked "DEMO".

## Known simplifications (MVP — see "Extending" below)

- **Reordering steps** uses up/down buttons rather than drag-and-drop.
  Functionally equivalent; swap in a library like `@dnd-kit/core` in
  `EditorClient.tsx` if you want the drag interaction.
- **Team invites** create the account directly with a temporary password
  you share out of band, rather than sending an invite email — no email
  provider is configured by default. Wire up an email service (Resend,
  SES, etc.) in `src/app/api/users/route.ts` for real email invites.
- **Attachments** are stored in Supabase Storage (a public bucket) when
  deployed per the guide below. For local development without Supabase,
  you'd need a Supabase project anyway (or swap in local-disk storage —
  see the git history / ask for that variant if you want offline-only dev).
- **Decision-tree steps** support a single yes/no branch per step, per the
  spec's "keep the first implementation simple" note. The data model
  (`decisionYesStepOrder` / `decisionNoStepOrder`) can be extended to a
  full graph later without a schema rewrite.
- **CSRF**: NextAuth's credentials flow includes CSRF protection out of
  the box for the auth endpoints. The custom API routes rely on
  same-origin fetch plus session cookies (`SameSite=Lax` by default) —
  for a production deployment behind multiple origins, add an explicit
  CSRF token check or switch cookies to `SameSite=Strict`.
- **Rate limiting** is not yet implemented on login/API routes. For
  production, add a rate limiter (e.g. `@upstash/ratelimit` if using
  Upstash Redis) in front of `/api/auth` and `/api/setup` at minimum.

None of these are structural — they're all places you add more code later
without touching the data model or the permission system.

## Local development

```bash
cp .env.example .env
# edit .env — set NEXTAUTH_SECRET to a long random string:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# For local dev without Supabase, you can point DATABASE_URL at a local
# Postgres instance, or see "Deploying for free" below to develop straight
# against your Supabase project.

npm install
npm run prisma:migrate   # applies the schema to whichever database DATABASE_URL points to
npm run prisma:seed      # optional — adds demo categories + articles
npm run dev
```

Open http://localhost:3000 — since no users exist yet, you'll land on the
**setup** page to create your Owner / Global Admin account.

If you ran the seed script and want to see the demo content as that admin
instead of your own account, sign in with `demo-admin@t-shoot.local` /
`ChangeMe123!` — **change that password immediately, or delete that user,
before using this anywhere real.**

## Deploying for free: GitHub + Supabase + Netlify

This gets the whole app online at $0/month: Netlify hosts the Next.js app
(both the pages and the API routes), Supabase provides the Postgres
database and file storage for attachments, and GitHub holds the source so
Netlify can build from it. NextAuth (already built into the app) remains
the login system — there's no need to also use Supabase's own Auth product.

### 1. Push the code to GitHub

```bash
cd t-shoot-kb
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repository on GitHub (github.com → New repository —
don't initialize it with a README), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

### 2. Create the Supabase project

1. Go to supabase.com → sign up (free) → **New project**. Pick a name,
   a database password (save it — you'll need it below), and a region
   close to you.
2. Once it's provisioned, go to **Project Settings → Database**. Under
   **Connection string**, copy:
   - The **URI** under **Transaction pooler** (port `6543`) — this is
     your `DATABASE_URL`. Add `?pgbouncer=true` to the end if it isn't
     already there.
   - The **URI** under **Session pooler** or the direct connection
     (port `5432`) — this is your `DIRECT_URL`, used only for migrations.
   Both contain the database password you set in step 1 — Supabase fills
   it in for you if you paste the password when prompted, or you can
   substitute it in manually where you see `[YOUR-PASSWORD]`.
3. Go to **Project Settings → API** and copy the **Project URL**
   (`SUPABASE_URL`) and the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`,
   under "Project API keys" — not the `anon` key; the service role key is
   secret and must only ever live in server environment variables).
4. Go to **Storage** (left sidebar) → **Create a new bucket** → name it
   `attachments` → toggle **Public bucket** on (screenshots need to be
   viewable without extra signed-URL logic for this MVP) → Create.

### 3. Apply the database schema to Supabase

On your own machine, with the values from step 2 in your local `.env`:

```bash
npm install
npm run prisma:migrate   # creates all the tables in your Supabase project
npm run prisma:seed      # optional — demo articles
```

You only need to do this once (and again for any future schema changes) —
it talks directly to Supabase's database, not to Netlify.

### 4. Deploy to Netlify

1. Go to app.netlify.com → **Add new site → Import an existing project**
   → choose GitHub → authorize → select your repository.
2. Netlify auto-detects Next.js. Leave the build command as
   `npm run build` (already set in `netlify.toml`, which also tells
   Netlify to use its official Next.js runtime plugin) and click **Deploy**.
3. Before or right after the first deploy, go to **Site configuration →
   Environment variables** and add:
   - `DATABASE_URL` and `DIRECT_URL` (from step 2)
   - `NEXTAUTH_SECRET` (generate one with the `node -e` command above)
   - `NEXTAUTH_URL` — your Netlify site URL, e.g.
     `https://your-site-name.netlify.app` (find it on the site overview
     page; you can also set up a custom domain later and update this)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from step 2)
   - `SUPABASE_STORAGE_BUCKET` = `attachments`
4. Trigger a redeploy (**Deploys → Trigger deploy → Deploy site**) so the
   new environment variables take effect.
5. Open your Netlify URL. Since the database has no users yet (unless you
   ran the seed script), you'll land on the setup page to create your
   Owner / Global Admin account — same as local dev, just live on the internet.

That's the whole stack: GitHub for source, Supabase for the database and
file storage, Netlify for hosting — all on free tiers. Supabase's free
tier pauses a project after a week of no activity; opening the site again
wakes it up (the first request after a pause takes a few extra seconds).

### Notes specific to this deployment path

- **File uploads go to Supabase Storage**, not local disk — this matters
  because Netlify's functions run in a stateless, ephemeral environment
  with no persistent filesystem between requests, so writing to
  `/public/uploads` (as a traditional server would) doesn't work here.
  This is already wired up in `src/app/api/articles/[id]/attachments/route.ts`.
- **Netlify's free tier** includes 100GB bandwidth/month and 300 build
  minutes/month, which is generous for a personal or small-team tool.
- **Custom domain**: Netlify lets you attach your own domain for free
  (you still pay your registrar for the domain itself) — Site
  configuration → Domain management.
- If you later outgrow Supabase's free database tier or Netlify's free
  function limits, nothing about this architecture needs to change —
  you're just upgrading the same services' paid tiers.

## Other deployment options

If you'd rather not use Netlify:

1. **Database**: as above, or any Postgres host (Neon, Railway, RDS).
2. **File storage**: Supabase Storage works with any host, since it's
   accessed over HTTPS from the API route rather than through the local
   filesystem — or swap in S3/R2 by changing `src/lib/supabase.ts` and
   the attachments route to use that provider's SDK instead.
3. **Secrets**: set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and the Supabase
   variables as environment variables in your hosting provider — never
   commit them.
4. **HTTPS**: any of these hosts (Netlify, Vercel, Fly.io, Render) handle
   TLS termination for you; NextAuth cookies are marked `Secure`
   automatically once `NEXTAUTH_URL` is `https://`.

## Backup & restore

- **Database**: Supabase's own dashboard (Database → Backups) provides
  daily backups automatically on all plans, including free. For extra
  safety, you can also schedule your own `pg_dump` against the direct
  connection string.
- **Attachments**: stored in Supabase Storage, which has its own
  durability — you can also download a bucket's contents from the
  Storage tab, or script a periodic export with the Supabase CLI.
- **Version history**: article version snapshots live in the database
  (`ArticleVersion` table) and are covered by the database backup — they
  are never deleted by normal editing, so a database restore recovers full
  article history, not just the latest state.
- **Restore**: restore the database from the relevant Supabase backup;
  attachments in Storage are unaffected by a database restore since
  they're a separate system (just make sure `Attachment.path` URLs in a
  restored backup still point at files that exist in Storage).

## Project structure

```
prisma/schema.prisma       Data model
prisma/seed.ts             Demo data
src/lib/rbac.ts            Permission matrix — the single source of truth for authorization
src/lib/auth.ts            NextAuth config (credentials + bcrypt)
src/lib/versioning.ts      Version snapshot logic
src/lib/supabase.ts        Server-only Supabase Storage client (attachments)
src/app/api/**             All backend routes (every one enforces auth + rbac)
src/app/**/page.tsx        UI routes
src/components/**          Shared UI (step viewer, step editor, badges, dialogs, etc.)
netlify.toml                Netlify build config (Next.js runtime plugin)
```

## Extending toward full team access

The architecture already supports this — enabling it is additive:

1. Use `src/app/admin/users` (Global Admin) to create accounts for
   colleagues with the appropriate role.
2. Wire up an email provider in `src/app/api/users/route.ts` if you want
   real invite emails instead of sharing a temporary password directly.
3. Everything else — visibility classification, review/approval workflow,
   audit logging — is already role-aware and requires no further changes.
