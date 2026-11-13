#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SELECT 'CREATE DATABASE ajaia_docs_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ajaia_docs_test')\gexec
SQL
