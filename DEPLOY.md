# Deploying GrowTH

Split deploy: **frontend → Vercel**, **backend → Render**, **database → Neon**.
(Matches the hosting plan in the original project spec: Vercel + Render, zero-budget free tiers.)

## 1. Database — Neon

1. Sign up at https://neon.tech (free tier), create a project named `growth`.
2. Copy the pooled connection string it gives you — looks like:
   `postgresql://<user>:<password>@<host>/<db>?sslmode=require`
3. Keep it — you'll paste it into Render as `DATABASE_URL` in step 2.

## 2. Backend — Render

1. Sign up at https://render.com, connect the `MONNNNNNNNNNN/project_stu5` GitHub repo.
2. Render will detect `render.yaml` at the repo root (Blueprint) — or create a Web Service
   manually with:
   - Root directory: `backend`
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && npm run start:prod`
   - Health check path: `/health`
3. Set env vars (Render dashboard → Environment):
   - `DATABASE_URL` → the Neon connection string from step 1
   - `CORS_ORIGIN` → your Vercel frontend URL (fill in after step 3, e.g. `https://project-stu5.vercel.app`)
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → Render can auto-generate these (already configured in `render.yaml`)
4. Deploy. Once live, note the backend URL (e.g. `https://growth-backend.onrender.com`).
5. Seed demo articles once (Render Shell tab, or run locally against the Neon URL):
   ```bash
   DATABASE_URL="<neon-url>" npm run prisma:seed
   ```

**Known limitation:** bone-age X-ray uploads are stored on Render's local disk, which is
wiped on every redeploy (Render free tier has no persistent volume). Fine for a demo; swap
to object storage (Cloudinary/S3/Supabase Storage) before relying on it long-term.

## 3. Frontend — Vercel

Using the existing project at
https://vercel.com/monnnnnnnnnnns-projects/project-stu5/settings:

1. Project settings → Root Directory → `frontend`
2. Build command: `npm run build` (auto-detected for Vite)
3. Output directory: `dist` (auto-detected)
4. Env var: `VITE_API_URL` → your Render backend URL from step 2
5. Redeploy. Then go back to Render and set `CORS_ORIGIN` to this Vercel URL.

## Local dev (unchanged)

```bash
docker compose up -d          # local Postgres + Redis
cd backend && npx prisma migrate dev && npm run prisma:seed && npm run start:dev
cd frontend && npm run dev
```
