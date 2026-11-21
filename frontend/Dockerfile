# Built from the MONOREPO ROOT context (see docker-compose.yml `context: .`)
# because this app depends on the workspace package @restrocore/types.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps ---
# The workspace lockfile includes backend's `usb` dependency (direct-USB
# ESC/POS printing, see backend/src/modules/orders/escpos-usb.ts) even
# though this app never imports it — `pnpm install --frozen-lockfile` still
# builds every workspace member's native addons. Same toolchain backend/
# Dockerfile needs, for the same reason (see that file's comment).
FROM base AS deps
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev pkgconfig
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/types/package.json shared/types/package.json
RUN pnpm install --frozen-lockfile

# --- builder ---
# BACKEND_URL is a build ARG, not a runtime env — Next.js bakes rewrite
# destinations into the routes manifest at build time (see next.config.ts
# and ARCHITECTURE.md's "reused from retail-pos" section for why a runtime
# env silently falls back to the default instead).
FROM deps AS builder
ARG BACKEND_URL=https://restro.piyushassudani.in
ENV BACKEND_URL=${BACKEND_URL}
COPY shared/types shared/types
COPY frontend frontend
RUN pnpm --filter @restrocore/types build
RUN pnpm --filter web build

# --- runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The standalone server (frontend/server.js) resolves `public/` and
# `.next/static` relative to ITS OWN traced monorepo path, i.e.
# frontend/public and frontend/.next/static under this WORKDIR — not a
# top-level ./public. Copying public/ to ./public (a sibling of apps/, not
# a child) silently 404s every static asset (logo, icons, favicon fallback)
# in production while `next dev` keeps working fine, since dev serves
# public/ directly from the source tree regardless of this path.
COPY --from=builder /repo/frontend/public ./frontend/public
COPY --from=builder /repo/frontend/.next/standalone ./
COPY --from=builder /repo/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
CMD ["node", "frontend/server.js"]
