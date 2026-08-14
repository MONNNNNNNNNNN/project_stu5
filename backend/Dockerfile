# syntax=docker/dockerfile:1

# Debian slim rather than alpine: Prisma's query engine and bcrypt both want glibc, and
# the musl variants are a recurring source of "works locally, dies in the container".
# Node is pinned to the same major the Render deploy uses (see render.yaml).
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# --- builder ---------------------------------------------------------------------------
# Full dependency tree, including the Prisma CLI (a devDependency) and the toolchain bcrypt
# needs when no prebuilt binary matches. This stage is also what the one-shot `migrate`
# service runs from, since `prisma migrate deploy` needs that CLI.
FROM base AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build


# --- production dependencies -----------------------------------------------------------
# Installed separately from the builder so the runtime image doesn't inherit the compiler
# toolchain or the dev dependency tree.
FROM base AS proddeps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev


# --- runtime ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=proddeps /app/node_modules ./node_modules
# The generated client is written into node_modules by `prisma generate`, so it has to be
# copied over the production tree explicitly — it isn't something `npm ci` can produce.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Avatars and bone-age X-rays are written to disk by multer and served back as static
# files, so this path is mounted as a volume in compose — without it, every uploaded image
# disappears the next time the container is replaced.
RUN mkdir -p uploads/avatars uploads/bone-age && chown -R node:node uploads

USER node
EXPOSE 3001
CMD ["node", "dist/main"]
