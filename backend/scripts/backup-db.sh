#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR:-./backups}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="${BACKUP_DIR:-./backups}/restrocore-${stamp}.dump"

pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" >"$file"
chmod 600 "$file"

if [ -n "${BACKUP_RETAIN_COUNT:-}" ]; then
  find "${BACKUP_DIR:-./backups}" -type f -name 'restrocore-*.dump' -print |
    sort -r |
    tail -n "+$((BACKUP_RETAIN_COUNT + 1))" |
    xargs -r rm -f
fi

echo "$file"
