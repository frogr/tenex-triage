# Tenex Triage

AI-powered email triage. Connects to Gmail, classifies your latest threads into smart buckets using GPT-4o-mini, and lets you organize with drag-and-drop, bulk actions, and AI-suggested categories.

**Live:** [tenex-triage.vercel.app](https://tenex-triage.vercel.app)
**Docs:** [tenex-triage.vercel.app/docs](https://tenex-triage.vercel.app/docs)

## How it works

1. **Sign in with Google** — read-only Gmail access, we never send or modify emails
2. **Fetch threads** — pulls your latest ~200 email threads from Gmail
3. **Classify** — GPT-4o-mini sorts each thread into your buckets with a confidence score
4. **Organize** — drag-and-drop, bulk move, edit/delete buckets, expand thread previews

Only unclassified threads are sent to the LLM by default. Manual moves are respected and never overwritten. A full classification of 200 threads costs ~$0.002.

## Local Setup

```bash
git clone https://github.com/frogr/tenex-triage.git
cd tenex-triage
npm install
cp .env.example .env   # fill in your values (see below)
npx prisma db push
npm run dev
```

### Environment Variables

Copy `.env.example` and fill in:

| Variable               | Where to get it                                                                  |
| ---------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`         | [Neon](https://neon.tech) — create a free Postgres database                      |
| `GOOGLE_CLIENT_ID`     | [Google Cloud Console](https://console.cloud.google.com) — OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above                                                                    |
| `NEXTAUTH_SECRET`      | Run `openssl rand -base64 32`                                                    |
| `OPENAI_API_KEY`       | [OpenAI Platform](https://platform.openai.com/api-keys)                          |

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Gmail API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
5. If the app is in "Testing" mode, add your Google account as a test user

## Scripts

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start dev server                   |
| `npm run build`      | Prisma generate + production build |
| `npm test`           | Run all 52 tests                   |
| `npm run test:watch` | Tests in watch mode                |
| `npm run lint`       | ESLint                             |
| `npx prisma studio`  | Database GUI                       |
| `npx prisma db push` | Push schema changes to database    |

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database:** PostgreSQL on [Neon](https://neon.tech)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` driver adapter
- **Auth:** NextAuth v5 beta (Google OAuth, database sessions)
- **Styling:** Tailwind CSS 4
- **AI:** OpenAI GPT-4o-mini (structured JSON output)
- **Testing:** Vitest 4 + React Testing Library
- **Deployment:** Vercel

## Architecture

```
src/
├── app/
│   ├── page.tsx                       # Landing page
│   ├── docs/page.tsx                  # Architecture guide (public, no auth)
│   ├── dashboard/
│   │   ├── page.tsx                   # Auth guard + layout
│   │   ├── dashboard.tsx              # Main client component (orchestrator)
│   │   ├── bucket-tabs.tsx            # Bucket nav + drag-drop targets
│   │   ├── thread-card.tsx            # Thread row (expandable, selectable, draggable)
│   │   ├── classification-log.tsx     # Streaming progress indicator
│   │   ├── create-bucket-dialog.tsx   # Create bucket + AI suggestions
│   │   ├── edit-bucket-dialog.tsx     # Edit/delete bucket
│   │   └── history/page.tsx           # Audit trail timeline
│   └── api/
│       ├── threads/route.ts           # GET threads + Gmail sync
│       ├── threads/[id]/route.ts      # PATCH move thread
│       ├── threads/[id]/preview/      # GET full message body from Gmail
│       ├── threads/bulk/route.ts      # PATCH bulk move
│       ├── classify/route.ts          # POST streaming classification
│       ├── buckets/route.ts           # GET/POST buckets
│       ├── buckets/[id]/route.ts      # PATCH/DELETE bucket
│       ├── suggestions/route.ts       # GET AI bucket suggestions
│       └── history/route.ts           # GET classification + sync history
├── lib/
│   ├── auth.ts                        # NextAuth config (Google OAuth)
│   ├── prisma.ts                      # Prisma singleton with pg adapter
│   ├── buckets.ts                     # Default bucket seeding
│   ├── gmail/
│   │   ├── client.ts                  # OAuth token refresh + Gmail client
│   │   └── threads.ts                 # Batched thread fetching + parsing
│   └── classifier/
│       ├── pipeline.ts                # Orchestrator: scan → batch → classify → persist
│       ├── batch.ts                   # Batch splitting + parallel execution + retry
│       ├── openai.ts                  # GPT-4o-mini with JSON schema
│       └── prompt.ts                  # System + user prompt construction
└── test/
    └── setup.ts                       # Vitest setup (React 19 cleanup)
```

## Key Design Decisions

- **Streaming classification** — `/api/classify` returns a `ReadableStream` of newline-delimited JSON events, so the UI updates in real-time instead of blocking on a spinner.
- **Incremental by default** — only unclassified threads hit the LLM. `reclassifyAll` is opt-in via the split button dropdown.
- **`userOverride` flag** — manual moves are never overwritten by the AI. These could also serve as few-shot examples in future.
- **Metadata-only sync, full body on demand** — thread sync pulls `format: "metadata"` for speed. Full message bodies are fetched from Gmail only when you expand a thread.
- **Structured output** — `json_schema` with `strict: true` on the OpenAI call. No regex parsing, no hallucinated bucket names.
- **Full audit trail** — every sync and classification is logged with timestamps, token counts, cost, and error states. Visible in `/dashboard/history`.

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add env vars from `.env.example`
4. Add production redirect URI to Google OAuth
5. Deploy — `prisma generate` runs automatically via the build script

---

Built for [Tenex](https://tenex.ai) by Austin French.
