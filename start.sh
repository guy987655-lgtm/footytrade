#!/bin/sh
set -e

echo "=== FootyTrade Backend Starting ==="
echo "Working directory: $(pwd)"
echo "Checking dist..."
ls -la dist/ || { echo "ERROR: dist/ folder missing!"; exit 1; }
ls dist/main.js || { echo "ERROR: dist/main.js missing!"; exit 1; }

echo "Running DB migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed || echo "Seed skipped (already seeded or failed)"

echo "Starting NestJS server..."
exec node dist/main
