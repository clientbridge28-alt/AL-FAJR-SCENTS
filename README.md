# Al Fajr Scents — Luxury Eau de Parfum Storefront

Full-stack e-commerce storefront and store administration console for **Al Fajr Scents** (`alfajrscents.pk`), built with **React 19, TypeScript, Tailwind CSS v4, Express, and SQLite (`better-sqlite3`)**.

## Features
- **Editorial Storefront & Catalogue**: Signature 50ml Eau de Parfum collection, fragrance family filtering, scent quiz (`/discover`), quick view modal, wishlist, and dynamic Fragrance Journal (`/journal`).
- **Product Detail & Customer Reviews**: Interactive 1–5 star ratings, rating distribution breakdown, rating filters, and optional order-number verification for Verified Purchase badges.
- **Server-Authoritative Cart & Checkout**: Persistent cookie-backed shopping cart, discount code validation, COD and Bank Transfer flows, and signature-verified webhook adapters for Safepay, PayFast, JazzCash, and Easypaisa.
- **Order Tracking & Newsletter**: Phone-verified order lookup (`/track-order`) and footer newsletter capture (`/api/newsletter`).
- **Protected Admin Portal (`/admin`)**: First-run admin setup, JWT cookie auth, product/image management, order & payment status updates, discount codes, review moderation, and store settings.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

The server runs on `http://localhost:3000`.

## Production Build & Start

```bash
npm run build
NODE_ENV=production npm start
```

## Pushing to GitHub & Hosting

> **Note:** GitHub Pages only serves static HTML/CSS/JS files and cannot run the Express backend or SQLite database. Host this repository on a Node.js platform such as **Render**, **Railway**, **Fly.io**, or **Google Cloud Run**.

1. Initialize Git and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Al Fajr Scents storefront"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Connect that GitHub repository to your Node.js host with:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `NODE_ENV=production npm start`
   - **Persistent Disk**: Mount `/app/data` (for `alfajr.db`) and `/app/public/uploads`
   - **Environment Variables**: Set `JWT_SECRET`, `APP_URL`, and optional gateway keys from `.env.example`
