# RestroCore Backend

NestJS API and PostgreSQL/Prisma backend for RestroCore.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a strong `JWT_SECRET`, database URL, and CORS origin.
3. Install dependencies with `pnpm install --frozen-lockfile`.
4. Run `pnpm --filter @restrocore/types build`.
5. Run `pnpm --filter @restrocore/backend prisma:generate`.
6. Run `pnpm --filter @restrocore/backend prisma:migrate`.
7. Start with `pnpm --filter @restrocore/backend dev`.

## Production

- Store `DATABASE_URL` and `JWT_SECRET` in the deployment platform's secret manager.
- Run Prisma migrations before starting the app.
- Deploy the PostgreSQL database as persistent server-side storage.
- Do not commit `.env`, uploaded files, database dumps, or generated build output.
