FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
RUN apk add --no-cache openssl python3 make g++ linux-headers eudev-dev libusb-dev pkgconfig
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
COPY shared/types/package.json shared/types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY shared/types shared/types
COPY backend backend
RUN pnpm --filter @restrocore/types build
RUN pnpm --filter @restrocore/backend exec prisma generate
RUN pnpm --filter @restrocore/backend build

FROM docker:cli AS dockercli

FROM alpine:3.20 AS compose-fetch
ARG TARGETARCH=amd64
RUN apk add --no-cache curl \
  && case "$TARGETARCH" in amd64) DARCH=x86_64 ;; arm64) DARCH=aarch64 ;; *) DARCH=$TARGETARCH ;; esac \
  && curl -fsSL --retry 3 --retry-delay 2 "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${DARCH}" -o /docker-compose \
  && chmod +x /docker-compose

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl eudev-libs libstdc++ postgresql16-client
RUN mkdir -p /usr/local/lib/docker/cli-plugins
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=compose-fetch /docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/backend/node_modules ./backend/node_modules
COPY --from=builder /repo/backend/dist ./backend/dist
COPY --from=builder /repo/backend/prisma ./backend/prisma
COPY --from=builder /repo/backend/package.json ./backend/package.json
COPY --from=builder /repo/shared/types/dist ./shared/types/dist
COPY --from=builder /repo/shared/types/package.json ./shared/types/package.json
COPY --from=builder /repo/shared/types/node_modules ./shared/types/node_modules
WORKDIR /repo/backend
EXPOSE 5006
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
