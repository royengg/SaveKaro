#!/bin/sh
set -e

echo "Running database migrations..."
bunx prisma migrate deploy

echo "Seeding database (safe to re-run)..."
bunx prisma db seed || echo "Seeding skipped or already done"

echo "Starting SaveKaro backend..."
exec bun run src/index.ts
