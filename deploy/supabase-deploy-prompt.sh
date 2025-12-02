#!/usr/bin/env bash
set -euo pipefail

# supabase-deploy-prompt.sh (non-interactive mode)
# Behavior:
#  - If `deploy/.supabase-credentials` exists it will be sourced and used non-interactively.
#  - The script prints the credentials file path and a masked preview (no secret leakage).
#  - If required variables are missing, it exits with clear instructions.
#  - This script is intended for CI/deploy machines; it does not prompt interactively.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDFILE="${DIR}/.supabase-credentials"

mask() {
  local v="$1"
  if [ -z "$v" ]; then
    echo "(empty)"
    return
  fi
  local len=${#v}
  if [ $len -le 8 ]; then
    echo "${v:0:1}***${v: -1}"
    return
  fi
  echo "${v:0:4}...${v: -4}"
}

if [ -f "$CREDFILE" ]; then
  # shellcheck disable=SC1090
  source "$CREDFILE"
  echo "Sourced credentials file: $CREDFILE"
  echo "Preview:"
  echo "  SUPABASE_PROJECT_REF=$(mask "${SUPABASE_PROJECT_REF-}")"
  echo "  SUPABASE_URL=$(mask "${SUPABASE_URL-}")"
  echo "  SUPABASE_SERVICE_ROLE_KEY=$(mask "${SUPABASE_SERVICE_ROLE_KEY-}")"

  # Validate required fields
  missing=()
  if [ -z "${SUPABASE_PROJECT_REF-}" ]; then missing+=("SUPABASE_PROJECT_REF"); fi
  if [ -z "${SUPABASE_URL-}" ]; then missing+=("SUPABASE_URL"); fi
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY-}" ]; then missing+=("SUPABASE_SERVICE_ROLE_KEY"); fi
  if [ ${#missing[@]} -ne 0 ]; then
    echo "\nCredentials file exists but is missing required fields: ${missing[*]}"
    echo "Edit $CREDFILE and add the missing variables, or set them in the environment."
    exit 1
  fi

  # Export variables and run the CI deploy script non-interactively
  export SUPABASE_PROJECT_REF
  export SUPABASE_URL
  export SUPABASE_SERVICE_ROLE_KEY

  printf "Running CI deploy script (non-interactive) using credentials from %s...\n" "$CREDFILE"
  exec "${DIR}/supabase-deploy-ci.sh"
else
  cat <<'EOF'
Credentials file not found: deploy/.supabase-credentials

Create it by copying the example and filling values:
  cp deploy/.supabase-credentials.example deploy/.supabase-credentials
  # then edit deploy/.supabase-credentials and fill SUPABASE_PROJECT_REF, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Alternatively, set environment variables and run the CI script directly:
  export SUPABASE_PROJECT_REF="your-ref"
  export SUPABASE_URL="https://your-ref.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  ./deploy/supabase-deploy-ci.sh

This wrapper now prefers non-interactive runs for CI; it will not prompt interactively.
EOF
  exit 1
fi
