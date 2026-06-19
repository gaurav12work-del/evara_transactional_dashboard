# EVARAA - Property Transaction Dashboard

An Airbnb property expense tracker for EVARAA (Stay &bull; Retreat &bull; Serenity), built with Next.js, Supabase, and TailwindCSS.

## Features

- **Multi-property management** — Add, edit, delete rental properties
- **Transaction tracking** — Income (bookings) and expenses (maintenance, utilities, taxes, insurance, other)
- **Opening balance** — Cumulative rolling balance that carries over month to month
- **Rich dashboard** — Charts, monthly comparisons, expense breakdowns
- **Property switcher** — View data per property or across all properties
- **Authentication** — Supabase Auth with email/password

## Tech Stack

- Next.js 16 (App Router)
- Supabase (Auth + PostgreSQL)
- TailwindCSS 4
- Recharts
- TypeScript
- Netlify (deployment)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Netlify

1. Push to GitHub
2. Connect repo to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy

## Opening Balance Logic

- Each property has an **initial opening balance** you set when creating it
- **Month N Opening Balance** = Previous month's closing balance
- **Closing Balance** = Opening Balance + Income - Expenses
- This rolls forward cumulatively across months
