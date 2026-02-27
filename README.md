# Tenex Triage

AI-powered email triage. Connects to Gmail, classifies your latest threads into smart buckets using GPT-4o-mini, and lets you create custom ones.

## How it works

1. **Sign in with Google** — read-only Gmail access, we never send or modify emails
2. **Fetch threads** — pulls your latest ~200 email threads from Gmail
3. **Classify** — GPT-4o-mini sorts each thread into one of your buckets (Needs Action, FYI, Newsletters, Notifications, Auto-Archive)
4. **Browse & organize** — filter by bucket, move threads between buckets manually, create custom buckets that trigger reclassification

Only unclassified threads are sent to the LLM. Manual moves are respected and never overwritten. A full classification of 200 threads costs ~$0.002.

## Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript
- **Database:** PostgreSQL on [Neon](https://neon.tech) (free tier)
- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Auth:** NextAuth.js v5 beta (Google OAuth, database sessions)
- **Styling:** Tailwind CSS 4
- **LLM:** OpenAI GPT-4o-mini (structured JSON output)
- **Testing:** Vitest + React Testing Library
- **Deployment:** Vercel

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Landing page (auth redirect)
│   ├── dashboard/
│   │   ├── page.tsx              # Auth guard + layout
│   │   ├── dashboard.tsx         # Main client component
│   │   ├── bucket-tabs.tsx       # Bucket nav (dropdown on mobile, tabs on desktop)
│   │   ├── thread-card.tsx       # Email thread row
│   │   ├── classification-log.tsx # Streaming classification progress
│   │   └── create-bucket-dialog.tsx
│   └── api/
│       ├── threads/route.ts      # GET threads, GET ?sync=true to fetch from Gmail
│       ├── threads/[id]/route.ts # PATCH to move thread between buckets
│       ├── classify/route.ts     # POST → streaming classification progress
│       └── buckets/route.ts      # CRUD for buckets
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma singleton with pg adapter
│   ├── buckets.ts                # Default bucket definitions + seeding
│   ├── gmail/
│   │   ├── client.ts             # OAuth token refresh + Gmail API client
│   │   └── threads.ts            # Fetch + parse Gmail threads (batched)
│   └── classifier/
│       ├── pipeline.ts           # Orchestrator: fetch → batch → classify → persist
│       ├── batch.ts              # Batch splitting + parallel execution with retry
│       ├── openai.ts             # GPT-4o-mini call with JSON schema
│       └── prompt.ts             # System + user prompt construction
└── test/
    └── setup.ts                  # Vitest setup (React 19 cleanup)
```

### Classification pipeline

Threads are split into batches of 25 and classified in parallel via `Promise.allSettled`. Failed batches retry once with backoff. The `/api/classify` endpoint streams progress as newline-delimited JSON, so the UI shows real-time updates. Results are persisted to the database with confidence scores and cost tracking per run.

### Gmail integration

Threads are fetched using paginated `threads.list` → batched `threads.get` (25 concurrent, 200ms delay). Access tokens are refreshed transparently using the stored refresh token. Gmail is only contacted when the user explicitly clicks "Refresh from Gmail" — no automatic syncing.

## Getting started

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

### Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
5. For production, add your Vercel URL as well
6. If the app is in "Testing" mode, add your Google account as a test user

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run tests (51 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npx prisma studio` | Open database GUI |

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all env vars from `.env.example` to the Vercel project settings
4. Add your production URL to Google OAuth redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`
5. Deploy

The `postinstall` script handles Prisma client generation automatically.

## Design decisions

- **No auto-sync on login** — fetching 200 threads from Gmail is slow (~5s). Users click "Refresh from Gmail" explicitly so they know what's happening.
- **Incremental classification** — only unclassified threads are sent to the LLM. Manual moves (`userOverride`) are never touched.
- **Streaming classification UI** — the classify endpoint streams progress events so the user sees real-time feedback instead of staring at a spinner.
- **Mobile-first** — bucket selector becomes a dropdown on mobile, thread cards use borderless dividers, move action uses native-feeling bottom sheets on desktop hover menus.
- **Cost transparency** — each classification run logs token usage and cost. 200 threads ≈ $0.002.

---

Built for [Tenex](https://tenex.ai) by Austin French.
