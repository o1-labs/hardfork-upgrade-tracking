#!/bin/sh
set -e

# Apply database schema (creates tables if needed, safe for production)
npx prisma db push --skip-generate

# Start the application
exec node dist/server.js
