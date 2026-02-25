#!/bin/sh
set -e

echo "Running database migrations..."
bunx prisma migrate deploy

echo "Starting SaveKaro backend..."
exec bun run src/index.ts
