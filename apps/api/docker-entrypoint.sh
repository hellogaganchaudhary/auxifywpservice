#!/bin/sh
set -e

if [ "${RUN_DB_SETUP:-true}" = "true" ]; then
  echo "Running database schema sync..."
  attempt=1
  until node node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --skip-generate; do
    if [ "$attempt" -ge 5 ]; then
      echo "Database schema sync failed after ${attempt} attempts."
      exit 1
    fi
    echo "Database schema sync failed on attempt ${attempt}; retrying in 20 seconds..."
    attempt=$((attempt + 1))
    sleep 20
  done

  if [ "${SEED_SUPER_ADMIN:-true}" = "true" ]; then
    echo "Seeding super-admin..."
    attempt=1
    until node apps/api/seed-super-admin.mjs; do
      if [ "$attempt" -ge 3 ]; then
        echo "Super-admin seed failed after ${attempt} attempts."
        exit 1
      fi
      echo "Super-admin seed failed on attempt ${attempt}; retrying in 20 seconds..."
      attempt=$((attempt + 1))
      sleep 20
    done
  fi
fi

exec "$@"
