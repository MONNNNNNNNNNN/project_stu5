# Running GrowTH as separate services

The hosted deploy is split across three providers — Vercel serves the built frontend, Render
runs the NestJS API **and the bone-age service**, Neon holds Postgres. `docker-compose.yml`
makes that same boundary explicit and runnable on one machine.

> **Not covered here:** the `growth-ai` inference service. It is a separate Render service and
> is not in `docker-compose.yml`, because it needs a model file that is not in the repo — see
> [`../ai-service/README.md`](../ai-service/README.md). Run it directly with uvicorn alongside
> compose if you need it locally.

```
browser ──▶ web (nginx :8080) ──┬──▶ static SPA bundle
                                └──▶ /api/* ──▶ api (NestJS :3001) ──▶ db (Postgres :5432)
                                                                        ▲
                                                        migrate (one-shot) ┘
```

| Service   | Image                  | Role |
|-----------|------------------------|------|
| `web`     | nginx 1.27-alpine      | Serves the built SPA, proxies `/api/*` to the API |
| `api`     | node 22-slim           | NestJS application |
| `migrate` | node 22-slim (builder) | Runs `prisma migrate deploy` once, then exits |
| `db`      | postgres 16-alpine     | Database, persisted in a named volume |

## Quick start

```bash
docker compose up --build        # app on http://localhost:8080
docker compose down              # stop, keep data
docker compose down -v           # stop and delete the database and uploaded files
```

Secrets come from `backend/.env` (copy `backend/.env.example` if you don't have one).
`DATABASE_URL` is overridden in compose to point at the local Postgres, so a `.env` aimed
at the hosted Neon database won't be used by accident.

## Why the split is drawn here and not somewhere else

**nginx is a real service, not just a file server.** Because it proxies `/api/*` to the
API, the browser only ever talks to one origin. That means no CORS configuration, and no
backend hostname baked into the JavaScript bundle — the same image works against any
backend. The trailing slash in `proxy_pass http://api:3001/;` is what strips the `/api`
prefix; the API serves its routes from the root (`/auth/login`, `/uploads/...`), so
removing that slash would 404 every call.

**Migrations are their own container.** `prisma migrate deploy` runs as a short-lived job
that exits, rather than being tacked onto the API's startup. The Prisma CLI is a
devDependency and so only exists in the builder stage, and running more than one API
replica would otherwise mean several containers racing to migrate the same database.

**The API is not split further.** Auth, children, growth, puberty, bone-age, articles and
notifications are modules inside one NestJS process. They share a database and a request
lifecycle, there is no independent scaling pressure on any of them, and splitting them
would buy network calls where there are currently function calls. The one candidate for
its own service is bone-age inference — image processing is genuinely different work — but
`BoneAgeService.predict()` is still a stub that throws `NotImplementedException` while the
model is trained separately. When that model lands, it's the natural first extraction.

**Redis was removed.** It was declared in compose but nothing in the backend connected to
it. A service diagram that shows components the code doesn't use is worse than no diagram.

## Things that will bite you

- **Uploads need the volume.** Avatars and bone-age X-rays are written to the container
  filesystem by multer and served back as static files. `growth_uploads` is what stops
  them vanishing on the next rebuild. The hosted Render deploy has this same weakness with
  no volume behind it — uploads there do not survive a redeploy.
- **`VITE_API_URL` is a build arg, not a runtime env var.** Vite inlines it at build time,
  so changing it means rebuilding the `web` image, not restarting the container.
- **This doesn't fix the hosted cold start.** Render's free plan spins the API down after
  ~15 minutes idle; that's a property of the plan, not of the architecture. See the
  `/health` warm-up ping and `.github/workflows/keep-backend-awake.yml` for how that's
  handled.
