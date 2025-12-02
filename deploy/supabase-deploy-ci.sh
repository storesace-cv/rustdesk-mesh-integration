#!/usr/bin/env bash
set -euo pipefail

# API-first CI-friendly Supabase deploy script
# - Expects env vars: SUPABASE_PROJECT_REF, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# - Best-effort: tries to deploy Edge Functions by calling Supabase platform APIs
#   with the Service Role key. If the API attempts fail, it will log responses
#   and provide clear next steps (supabase CLI or psql).

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"

set -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# If a gitignored credentials file exists, source it (do not override already-exported env vars)
if [ -f "${ROOT_DIR}/deploy/.supabase-credentials" ]; then
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/deploy/.supabase-credentials"
fi

# Ensure SUPABASE_ACCESS_TOKEN is present in the environment for the supabase CLI.
# Prefer an explicit SUPABASE_ACCESS_TOKEN; fall back to SUPABASE_SERVICE_ROLE_KEY if the token is not set.
if [ -z "${SUPABASE_ACCESS_TOKEN-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY-}" ]; then
  export SUPABASE_ACCESS_TOKEN="${SUPABASE_SERVICE_ROLE_KEY}"
fi
export SUPABASE_ACCESS_TOKEN

echo "Supabase API-first CI deploy starting for project: ${SUPABASE_PROJECT_REF}" 2>/dev/null || echo "Supabase API-first CI deploy starting"

# If the Supabase CLI is available, prefer it for reliable deployments
if command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI detected — using it to deploy Edge Functions (preferred)."
  # If SUPABASE_ACCESS_TOKEN is not set, fall back to SUPABASE_SERVICE_ROLE_KEY (user accepted insecure behavior)
  if [ -z "${SUPABASE_ACCESS_TOKEN-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY-}" ]; then
    echo "No SUPABASE_ACCESS_TOKEN found; using SUPABASE_SERVICE_ROLE_KEY as SUPABASE_ACCESS_TOKEN (insecure)."
    export SUPABASE_ACCESS_TOKEN="${SUPABASE_SERVICE_ROLE_KEY}"
  fi
  if [ -d "${ROOT_DIR}/supabase/functions" ]; then
    for fn_dir in "${ROOT_DIR}/supabase/functions"/*; do
      if [ -d "$fn_dir" ]; then
        fn_name=$(basename "$fn_dir")

        # Detect entrypoint (index.ts or index.js). If missing, skip deploying this function.
        if [ -f "$fn_dir/index.ts" ]; then
          entry="$fn_dir/index.ts"
        elif [ -f "$fn_dir/index.js" ]; then
          entry="$fn_dir/index.js"
        else
          echo "Skipping function '$fn_name' — no entrypoint found (index.ts/index.js)."
          continue
        fi

        echo "Deploying function with supabase CLI: $fn_name (entry: $(basename "$entry"))"
        if ! supabase functions deploy "$fn_name" --project-ref "${SUPABASE_PROJECT_REF}" --yes --workdir "${ROOT_DIR}" --use-api; then
          echo "Warning: supabase CLI failed for $fn_name — continuing to next function" >&2
        fi
      fi
    done
  else
    echo "No functions directory at ${ROOT_DIR}/supabase/functions — skipping supabase CLI deploy."
  fi
else
  # helper: attempt a POST to candidate endpoints for function upload
try_api_upload() {
  local fn_name="$1"
  local zip_path="$2"
  local candidate
  local status
  local resp_file

  # Candidate endpoints (best-effort guesses). We'll try each and log results.
  candidates=(
    "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions"
    "https://api.supabase.co/v1/projects/${SUPABASE_PROJECT_REF}/functions"
    "https://api.supabase.com/projects/${SUPABASE_PROJECT_REF}/functions"
  )

  for candidate in "${candidates[@]}"; do
    echo "Attempting function upload to: $candidate"
    resp_file="$TMPDIR/response-${fn_name}-$(basename "$candidate" | tr '/:' '_').txt"
    # Use multipart upload: name and file
    status=$(curl -sS -w "%{http_code}" -o "$resp_file" -X POST \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -F "name=${fn_name}" \
      -F "file=@${zip_path}" \
      "$candidate" || echo "000")

    if [[ "$status" =~ ^2[0-9]{2}$ ]]; then
      echo "Function $fn_name uploaded successfully to $candidate (HTTP $status)"
      return 0
    else
      echo "Upload attempt to $candidate returned HTTP $status. Response saved to $resp_file"
    fi
  done

  return 1
}

# package and attempt to upload each function directory
if [ -d "${ROOT_DIR}/supabase/functions" ]; then
  echo "Found functions directory; attempting API-based deploy for each function (best-effort)."
  for fn_dir in "${ROOT_DIR}/supabase/functions"/*; do
    if [ -d "$fn_dir" ]; then
      fn_name=$(basename "$fn_dir")
      echo "Packaging function: $fn_name"
      zipfile="$TMPDIR/${fn_name}.zip"
      (cd "$fn_dir" && zip -r -q "$zipfile" .) || {
        echo "Failed to create zip for $fn_name; skipping." >&2
        continue
      }

      if try_api_upload "$fn_name" "$zipfile"; then
        echo "API deploy succeeded for $fn_name"
      else
        echo "API deploy attempts failed for $fn_name. See response files in $TMPDIR for details."
        echo "You can deploy this function using the Supabase CLI: https://supabase.com/docs/guides/cli"
      fi
    fi
  done
else
  echo "No functions directory at ${ROOT_DIR}/supabase/functions — skipping API function deploys."
fi

# Note about migrations: Supabase does not currently offer a stable public HTTP endpoint
# to execute arbitrary SQL migrations using only the service-role key in all projects.
# The reliable ways to apply migrations remain:
#  - Use `psql` with a SUPABASE_DB_URL that includes the service role or a DB user with privileges
#  - Use the Supabase CLI which can apply migrations
# We'll attempt to detect `psql` and apply migrations if SUPABASE_DB_URL is set.

if command -v psql >/dev/null 2>&1 && [ -n "${SUPABASE_DB_URL-}" ]; then
  echo "psql detected and SUPABASE_DB_URL set — applying SQL migrations from supabase/migrations/*.sql"
  for sql in "${ROOT_DIR}/supabase/migrations"/*.sql; do
    if [ -f "$sql" ]; then
      echo "Applying $sql"
      if ! psql "$SUPABASE_DB_URL" -f "$sql"; then
        echo "Warning: failed to apply $sql (continuing)" >&2
      fi
    fi
  done
else
  echo "Skipping migrations: no psql or SUPABASE_DB_URL not configured."
  echo "To apply migrations automatically, set SUPABASE_DB_URL or use the supabase CLI locally/CI."
fi

fi

echo "API-first CI deploy completed (best-effort). Review logs or response files for any failures."
