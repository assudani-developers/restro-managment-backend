# Production Runbook

## Required invariants

- PostgreSQL is the source of truth; no tenant data may be stored only in browser state.
- Every mutating order, payment, stock, and folio operation uses a Prisma transaction.
- Payment and checkout requests use a client request id; replayed requests must not create duplicate payments.
- Branch and tenant authorization is enforced by the API, not by hidden UI controls.
- Backups must be tested by restore before a major migration or destructive operation.

## Database

- Set `DATABASE_URL` with `connection_limit=10&pool_timeout=20` for each application instance.
- Run `pnpm --filter @restrocore/backend prisma:migrate deploy` before starting a new backend version.
- Run migrations once through one deployment process; do not run them concurrently across replicas.
- Never edit or delete migration files after they have been deployed.

## Backup and restore

The server backup module also supports scheduled S3 backups. For a local PostgreSQL dump:

```sh
DATABASE_URL="$DATABASE_URL" BACKUP_DIR=/secure/backups BACKUP_RETAIN_COUNT=14 \
  backend/scripts/backup-db.sh
```

Restore requires an explicit confirmation and a clean maintenance window:

```sh
CONFIRM_RESTORE=RESTORE DATABASE_URL="$DATABASE_URL" \
  BACKUP_FILE=/secure/backups/restrocore-YYYYMMDDTHHMMSSZ.dump \
  backend/scripts/restore-db.sh
```

Keep at least one immutable off-server copy. Test restores regularly and before an application upgrade.

## Deploy order

1. Deploy PostgreSQL and apply migrations.
2. Deploy backend with `PORT=5006`.
3. Verify `/api/docs` is disabled in production unless explicitly enabled behind access control.
4. Deploy frontend with `BACKEND_URL=https://restro.piyushassudani.in`.
5. Verify login, POS checkout, KDS, realtime socket, and public QR flow.

## Incident response

- Rotate `JWT_SECRET` only through a coordinated deployment; existing sessions invalidate.
- Suspicious IP or account: disable account and block at the edge/reverse proxy.
- Payment mismatch: stop writes, export audit logs, take a backup, then reconcile in a transaction.
