# Bella Vita 🌹

**Cosmétiques capillaires haut de gamme** — Bilingual (French + Arabic) e‑commerce site for an Algerian hair products brand. Cash on delivery, no online payment.

Stack: **React + Vite + Tailwind** (frontend) · **Node.js + Express + SQLite** (backend) · single-service Render deployment.

---

## Features

### Customer site
- 🌐 Bilingual French / Arabic with one-click toggle (auto RTL for Arabic)
- 🛍️ Product catalog with category filter and search
- 🛒 Persistent cart (localStorage)
- 📋 Cart + checkout form (name, phone, wilaya, address, notes)
- ✅ Order confirmation with reference number
- 💳 Cash on delivery (no online payment)
- 📱 Fully responsive

### Admin panel (`/admin/login`)
- 📊 **Dashboard** — total orders, pending, delivered, revenue, top 5 products, last 7 days chart
- 🛍️ **Products** — add / edit / delete, with image upload
- 🏷️ **Categories** — full CRUD
- 📦 **Orders** — list, view detail, change status (pending → confirmed → shipped → delivered → cancelled)
- 🔐 JWT-based authentication

---

## Project structure

```
bella-vita/
├── backend/                  Node.js + Express API
│   ├── server.js
│   ├── db.js                 SQLite schema
│   ├── initDb.js             Seeds admin + categories
│   ├── routes/               auth · products · categories · orders · stats
│   ├── middleware/           auth (JWT) · upload (multer)
│   └── uploads/              Product images (auto-created)
├── frontend/                 React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/            Home, Shop, Product, Cart, Checkout, Admin*
│   │   ├── components/       Navbar, Footer, ProductCard
│   │   ├── context/          Language, Cart, Auth
│   │   ├── locales/          translations.js, wilayas.js
│   │   └── api/client.js     Axios calls
│   └── tailwind.config.js
└── render.yaml               One-click Render deployment
```

---

## Local setup

### Prerequisites
- Node.js 18+ installed (download from <https://nodejs.org>)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET (random long string) and ADMIN_PASSWORD (your choice)
npm install
npm run init-db          # creates the database + admin user
npm run dev              # starts on http://localhost:4000
```

### 2. Frontend (in a second terminal)
```bash
cd frontend
cp .env.example .env     # default points to http://localhost:4000 — fine for local
npm install
npm run dev              # starts on http://localhost:5173
```

Open <http://localhost:5173>. The admin panel is at <http://localhost:5173/admin/login> — log in with the credentials from your `.env`.

---

## Deploying to Render (recommended)

The included `render.yaml` deploys everything as **one service** (backend serves the built frontend), with a 1 GB persistent disk for the database and uploaded images.

### Step-by-step

1. **Push the code to GitHub** (create a new repo, push this folder).

2. **Sign up at <https://render.com>** (free — GitHub login works).

3. In Render dashboard → click **New** → **Blueprint** → connect your GitHub repo. Render reads `render.yaml` automatically.

4. Render will ask you to fill in `ADMIN_PASSWORD` (sync: false). Pick a strong password.

5. Click **Apply**. First build takes ~5 min. When green, your site is at the URL shown (e.g. `https://bella-vita-api.onrender.com`).

6. Visit `<your-url>/admin/login` and sign in.

### Render plan choice
- **Free** ($0) — site sleeps after 15 min idle, ~30 sec cold start. Fine for testing only.
- **Starter** ($7/mo) — always on, 0.5 GB RAM, perfect for this. **Already set in render.yaml.**
- The 1 GB disk costs ~$0.25/mo extra.

> **Important:** the SQLite database lives on the persistent disk at `/var/data/bellavita.db`. As long as you don't change the disk, your data is safe across deploys. Always download a backup before major updates: open the Render shell and run `cat /var/data/bellavita.db > /tmp/backup.db`, then download.

### Alternatives to Render (briefly)
- **Railway** — same workflow, slightly more generous free tier, no sleep on free.
- **Hostinger / Namecheap VPS** — cheaper long-term ($3-5/mo) but requires Linux/server knowledge.
- **Vercel + Supabase** — would require splitting into frontend (Vercel) + Postgres backend (Supabase). More moving parts but very fast.

For your use case (simple, non-tech maintenance, Algerian market), **Render Starter is the best balance**.

---

## Day-to-day operations (for the brand owner)

### Add a new product
1. Go to `/admin/products`
2. Click **+ Ajouter un produit**
3. Fill French + Arabic name, prices, category, upload image
4. Save — it appears on the shop instantly

### Process an order
1. Go to `/admin/orders` — new orders show up with status **En attente**
2. Click **Détails** to see customer info and items
3. Call the customer at the phone number listed
4. Change status: **Confirmée** → **Expédiée** → **Livrée**
5. Revenue stats only count **delivered** orders

### Change admin password
- Edit `ADMIN_PASSWORD` in your Render service environment variables
- Trigger a manual deploy (or run `npm run init-db` from the Render shell)

---

## Tech notes

- **Database:** SQLite via `better-sqlite3` — file-based, zero-config, scales to thousands of orders no problem. If the brand grows past ~10k orders/month, migrate to Postgres (5–10 lines of changes).
- **Images:** stored on disk under `/var/data/uploads`, served as static files. For larger catalogs, swap for Cloudinary or S3.
- **Security:** passwords hashed with bcrypt; admin auth via JWT (7-day expiry); server recomputes order totals to prevent client tampering.
- **Currency:** displayed as "DA" (FR) / "دج" (AR). Numbers stored as REAL in DB.
- **No tests included** — for a real production launch I'd recommend adding basic Jest tests for the order submission flow.

---

## License

MIT — use freely for the Bella Vita brand. Built with ♥
