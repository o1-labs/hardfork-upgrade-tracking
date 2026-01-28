#!/bin/sh
set -e

# Apply database schema (creates tables if needed, safe for production)
npx prisma db push --url "${DATABASE_URL}"

# Start the application
exec node dist/server.js
