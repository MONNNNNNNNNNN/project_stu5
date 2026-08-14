# syntax=docker/dockerfile:1

# --- builder ---------------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite inlines env vars at build time, so this is a build arg rather than a runtime one.
# It defaults to a same-origin path because nginx (below) proxies /api to the api service:
# that keeps the browser talking to a single origin, so there's no CORS to configure and
# no backend hostname baked into the bundle.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


# --- runtime ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
