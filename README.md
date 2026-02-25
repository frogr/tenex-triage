# Tenex Triage

AI-powered email triage. Connects to Gmail, classifies your last 200 threads into smart buckets, and lets you create custom ones.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL on Neon
- **ORM:** Prisma
- **Auth:** NextAuth.js v5 (Google OAuth)
- **Styling:** Tailwind CSS
- **LLM:** GPT-4o-mini
- **Deployment:** Vercel

## Getting started

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Environment variables

See `.env.example` for the full list. You'll need:

- Google OAuth credentials (GCP Console)
- A Neon database URL
- An OpenAI API key
- A NextAuth secret (`openssl rand -base64 32`)
