#!/bin/sh

set -e

# Ambil env variables yang di-inject
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-refina}
DATABASE_URL=${DATABASE_URL}

# Ambil command dari argument pertama (default: deploy)
PRISMA_CMD=${1:-deploy}

# Build DATABASE_URL jika belum ada
if [ -z "$DATABASE_URL" ]; then
  if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Either DATABASE_URL or DB_PASSWORD must be set"
    exit 1
  fi
  
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "Built DATABASE_URL from environment variables"
fi

# Export DATABASE_URL untuk Prisma
export DATABASE_URL

echo "========================================="
echo "Starting Prisma Migration"
echo "========================================="
echo "Command: $PRISMA_CMD"
echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"
echo "Database Name: $DB_NAME"
echo "-----------------------------------------"

# Check database connection
echo "Checking database connection..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    echo "Waiting for database to be ready..."
    sleep 2
done

echo "✓ Database is ready"
echo "-----------------------------------------"

# Run Prisma command based on argument
case "$PRISMA_CMD" in
  deploy)
    echo "Running Prisma migrate deploy..."
    npx prisma migrate deploy
    EXIT_CODE=$?
    ;;
    
  dev)
    echo "Running Prisma migrate dev..."
    npx prisma migrate dev
    EXIT_CODE=$?
    ;;
    
  reset)
    echo "Running Prisma migrate reset..."
    npx prisma migrate reset --force
    EXIT_CODE=$?
    ;;
    
  seed)
    echo "Running Prisma db seed..."
    npx prisma db seed
    EXIT_CODE=$?
    ;;
    
  generate)
    echo "Running Prisma generate..."
    npx prisma generate
    EXIT_CODE=$?
    ;;
    
  status)
    echo "Checking migration status..."
    npx prisma migrate status
    EXIT_CODE=$?
    ;;
    
  *)
    echo "Unknown command: $PRISMA_CMD"
    echo "Available commands: deploy, dev, reset, seed, generate, status"
    exit 1
    ;;
esac

if [ $EXIT_CODE -eq 0 ]; then
    echo "-----------------------------------------"
    echo "✓ Prisma $PRISMA_CMD completed successfully"
    echo "========================================="
else
    echo "-----------------------------------------"
    echo "✗ Prisma $PRISMA_CMD failed with exit code: $EXIT_CODE"
    echo "========================================="
    exit $EXIT_CODE
fi