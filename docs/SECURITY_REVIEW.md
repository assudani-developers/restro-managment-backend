# Security and Reliability Review

The 2026-11-21 review found and addressed:

- Instance-wide backups are restricted to platform superadmins.
- Branch access requires branch assignment for non-owner staff.
- Sync peer URLs require HTTPS, public resolution, redirect blocking, and an address-pinned connection.
- Checkout uses an order-row lock and idempotent payment request keys.
- Geofence guards recognize branch IDs from query or body.
- Custom roles cannot reserve platform role names.
- CORS and WebSocket origins use explicit allowlists.
- Security headers and a production CSP are enabled.
- Orders, payments, stock, folio, and audit operations use database transactions.

Right-click disabling is intentionally not implemented: it does not prevent
browser automation or API abuse and makes legitimate POS/browser workflows worse.
Authorization and validation remain server-side.

## Deployment checks

Before every release:

1. Run the CI workflow.
2. Run database migrations once against PostgreSQL.
3. Take and verify a backup.
4. Scan tracked files for `.env`, private keys, credentials, and hardcoded secrets.
5. Run login, POS checkout, KDS, QR, socket, and public guest flows.
