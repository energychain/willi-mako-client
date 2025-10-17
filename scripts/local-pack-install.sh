#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found in PATH" >&2
  exit 1
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

run_step() {
  local label="$1"
  shift
  echo "\n▶ $label"
  "$@"
}

run_step "Running test suite" npm test
run_step "Building distribution" npm run build

TARBALL="$(npm pack --silent)"
trap 'rm -f "${TARBALL}"' EXIT

echo "\n📦 Created package archive: ${TARBALL}"
run_step "Installing ${PACKAGE_NAME}@${PACKAGE_VERSION} globally" npm install -g "./${TARBALL}"

echo "\n✅ Installed ${PACKAGE_NAME}@${PACKAGE_VERSION} globally from local sources."
