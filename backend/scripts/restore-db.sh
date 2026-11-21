#!/usr/bin/env sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "RESTORE" ]; then
  echo 'Set CONFIRM_RESTORE=RESTORE before restoring' >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ] || [ -z "${BACKUP_FILE:-}" ]; then
  echo "DATABASE_URL and BACKUP_FILE are required" >&2
  exit 1
fi
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$BACKUP_FILE"
