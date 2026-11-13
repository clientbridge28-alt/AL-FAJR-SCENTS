# Al Fajr Scents — Architecture, Database & Deployment Guide

## 1. Architecture Summary (Environment Alignment)
In this AI Studio runtime, the application is built on **React 19 + TypeScript + Tailwind CSS v4** with a dedicated **Express (`server.ts`)** backend and **SQLite (`better-sqlite3`)** relational database with WAL mode and strict foreign keys.

If migrating later to **Next.js + Supabase + Vercel Pro**:
- Move `server/db.ts` tables directly to Supabase PostgreSQL migrations with Row-Level Security (RLS).
- Move `server/payments.ts` and `server.ts` `/api/*` endpoints into Next.js App Router Route Handlers (`app/api/.../route.ts`).
- Keep `src/pages/*` and `src/components/*` modular UI components intact.

## 2. Database Schema (`server/db.ts`)
Tables created automatically on startup (`initDatabase()`):
- `categories`, `products`, `product_images`
- `customers`, `customer_addresses`
- `carts`, `cart_items`
- `orders`, `order_items`
- `payments`, `payment_events` (idempotent webhook log)
- `discount_codes`, `reviews`, `admin_users`, `store_settings`, `newsletter_subscribers`, `journal_articles`, `contact_messages`

## 3. Environment Variables (`.env`)
Copy `.env.example` to `.env` and configure:
- `APP_URL=https://alfajrscents.pk`
- `JWT_SECRET=<strong-random-32-char-secret>`
- Optional `ADMIN_EMAIL` & `ADMIN_PASSWORD` (or create your master admin once via `/admin` first-run setup UI)
- Payment Gateway Keys (Safepay, PayFast, JazzCash, Easypaisa) when merchant accounts are approved.

## 4. Production Deployment & Domain (`alfajrscents.pk`)
1. **GitHub**: Push repository to private GitHub repo (`.env` and `data/` are excluded via `.gitignore`).
2. **Hosting**:
   - **Cloud Run / Node.js VPS**: Run `npm run build` then `NODE_ENV=production npm start` (listens on port `3000`). Mount persistent storage volume for `/app/data/alfajr.db` and `/app/public/uploads`.
   - **Vercel (Commercial)**: Note Vercel Hobby is non-commercial; commercial stores require Vercel Pro and an external hosted PostgreSQL database (Supabase/Neon) instead of local SQLite file storage.
3. **DNS & SSL**: Point `A` / `CNAME` records for `alfajrscents.pk` and `www.alfajrscents.pk` to your Cloud Run or hosting endpoint and enable managed TLS/SSL.
4. **Google Search Console**: Submit `https://alfajrscents.pk/sitemap.xml` and verify `robots.txt` + Product JSON-LD via Google Rich Results Test.
