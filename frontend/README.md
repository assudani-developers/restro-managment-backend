# RestroCore Frontend

Next.js web, POS, staff, and guest-facing frontend for RestroCore.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `BACKEND_URL` to the backend server URL.
3. Install dependencies with `pnpm install --frozen-lockfile`.
4. Build shared types with `pnpm --filter @restrocore/types build`.
5. Start with `pnpm --filter @restrocore/web dev`.

## Production

- Set `BACKEND_URL` at build time for the Docker image.
- Deploy server-side so session cookies and `/api/*` rewrites remain same-origin.
- Store frontend configuration in deployment environment variables, never in source files.
