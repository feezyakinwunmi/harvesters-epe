#!/usr/bin/env bash
# Runs all migrations + database tests on a throwaway LOCAL PostgreSQL
# database (PostgreSQL 15+). Uses a small shim for Supabase's auth/storage
# schemas, so no Docker or Supabase project is needed.
#
#   PGURL=postgres://postgres:postgres@localhost:5432/postgres ./scripts/test-db-local.sh
#
# For a full-fidelity run against real Supabase internals, use a STAGING
# project instead:  psql "$STAGING_DB_URL" -f supabase/tests/database.test.sql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGURL="${PGURL:-postgres://postgres@localhost:5432/postgres}"
DB="hc_test_$$"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" "$PGURL" -c "create database $DB" >/dev/null
cleanup() { "${PSQL[@]}" "$PGURL" -c "drop database if exists $DB" >/dev/null || true; }
trap cleanup EXIT

TEST_URL="${PGURL%/*}/$DB"

echo "→ applying shim + migrations"
"${PSQL[@]}" "$TEST_URL" < "$ROOT/supabase/tests/local/supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" "$TEST_URL" < "$f" >/dev/null 2>&1 || { echo "✗ migration failed: $f"; "${PSQL[@]}" "$TEST_URL" < "$f"; exit 1; }
done

echo "→ re-applying migrations (idempotency check)"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" "$TEST_URL" < "$f" >/dev/null 2>&1 || { echo "✗ migration is not re-runnable: $f"; exit 1; }
done

echo "→ running database tests"
OUT="$("${PSQL[@]}" "$TEST_URL" < "$ROOT/supabase/tests/database.test.sql" 2>&1)" || { echo "$OUT" | grep -v 'NOTICE:  ok' ; exit 1; }
PASSED="$(echo "$OUT" | grep -c 'NOTICE:  ok' || true)"
echo "$OUT" | grep -q 'ALL DATABASE TESTS PASSED' || { echo "$OUT"; exit 1; }
echo "✓ $PASSED database assertions passed"
