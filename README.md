# fitness.trollrunner.net

TrollRunner's AI fitness platform — Strava-grade activity tracking plus an
adaptive coach for running, strength, recovery, and nutrition. Premium
dark-first SaaS look; deliberately not the pixel aesthetic used elsewhere
on TrollRunner.

Full architecture, locked decisions, and the 15-phase build plan live in
[docs/DESIGN.md](docs/DESIGN.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (shared
TrollRunner project: auth + Postgres/RLS) · Recharts · Framer Motion.

## Develop

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (this is what Vercel runs)
```

## Deploy

Hosted on Vercel (free Hobby tier), auto-deploying every push to `main`.
One-time setup:

1. vercel.com → Add New Project → import `mayurski-art/trollrunner-fitness`
   (defaults are fine — it detects Next.js).
2. Project → Settings → Domains → add `fitness.trollrunner.net`, then set
   the DNS record for `fitness` to `CNAME cname.vercel-dns.com` at your DNS
   provider (replacing the old GitHub Pages record, if any).

Server-side secrets (Strava client secret, later the Claude API key) go in
Vercel → Settings → Environment Variables — never in this repo.
