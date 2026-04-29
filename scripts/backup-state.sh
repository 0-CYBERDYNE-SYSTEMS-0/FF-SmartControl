#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Retention settings
DAILY_RETENTION_DAYS=7
WEEKLY_RETENTION_DAYS=28

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/backup-state.sh [--workspace /abs/path] [--out-dir /abs/path] [--name prefix] [--weekly] [--dry-run]

Defaults:
  workspace: $FFT_NANO_MAIN_WORKSPACE_DIR or ~/nano
  out-dir:   ./backups
  name:      farmpal

Creates a .tar.gz backup that preserves:
  - farmpal.env (.env file in project root)
  - data/ directory (contains farmpal.db)
  - groups/ directory
  - workspace directory (if present)

Retention policy (applied after backup):
  - Daily backups: keep for 7 days
  - Weekly backups: keep for 28 days

Examples:
  ./scripts/backup-state.sh                        # Daily backup
  ./scripts/backup-state.sh --weekly               # Weekly backup
  ./scripts/backup-state.sh --out-dir /tmp/bak    # Custom output dir
USAGE
}

WORKSPACE_DIR="${FFT_NANO_MAIN_WORKSPACE_DIR:-$HOME/nano}"
OUT_DIR="$ROOT_DIR/backups"
NAME_PREFIX="farmpal"
DRY_RUN=0
WEEKLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ $# -ge 2 ]] || { echo "ERROR: --workspace requires a value" >&2; exit 2; }
      WORKSPACE_DIR="$2"
      shift 2
      ;;
    --out-dir)
      [[ $# -ge 2 ]] || { echo "ERROR: --out-dir requires a value" >&2; exit 2; }
      OUT_DIR="$2"
      shift 2
      ;;
    --name)
      [[ $# -ge 2 ]] || { echo "ERROR: --name requires a value" >&2; exit 2; }
      NAME_PREFIX="$2"
      shift 2
      ;;
    --weekly)
      WEEKLY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

declare -a tar_args=()
declare -a included=()

add_if_exists() {
  local base_dir="$1"
  local rel_path="$2"
  if [[ -e "$base_dir/$rel_path" ]]; then
    tar_args+=("-C" "$base_dir" "$rel_path")
    included+=("$base_dir/$rel_path")
  fi
}

add_if_exists "$ROOT_DIR" ".env"
add_if_exists "$ROOT_DIR" "data"
add_if_exists "$ROOT_DIR" "groups"

if [[ -d "$WORKSPACE_DIR" ]]; then
  tar_args+=("-C" "$(dirname "$WORKSPACE_DIR")" "$(basename "$WORKSPACE_DIR")")
  included+=("$WORKSPACE_DIR")
fi

if [[ ${#tar_args[@]} -eq 0 ]]; then
  echo "ERROR: no backup sources found (checked .env, data/, groups/, workspace)." >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"

# Weekly backups use different prefix for retention separation
if [[ "$WEEKLY" -eq 1 ]]; then
  backup_type="weekly"
  archive_path="$OUT_DIR/${NAME_PREFIX}-weekly-${timestamp}.tar.gz"
else
  backup_type="daily"
  archive_path="$OUT_DIR/${NAME_PREFIX}-backup-${timestamp}.tar.gz"
fi

echo "FarmPal state backup ($backup_type)"
echo "  root:      $ROOT_DIR"
echo "  workspace: $WORKSPACE_DIR"
echo "  out:       $archive_path"
echo "  includes:"
for item in "${included[@]}"; do
  echo "    - $item"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run only; archive not created."
  exit 0
fi

tar -czf "$archive_path" "${tar_args[@]}"
echo "Backup complete: $archive_path"

# Apply retention policy
echo ""
echo "Applying retention policy..."
if [[ "$WEEKLY" -eq 1 ]]; then
  # Weekly backups: keep for 28 days
  deleted=$(find "$OUT_DIR" -name "${NAME_PREFIX}-weekly-*.tar.gz" -type f -mtime +${WEEKLY_RETENTION_DAYS} -delete -print 2>/dev/null | wc -l || echo "0")
  echo "  Removed $deleted weekly backups older than ${WEEKLY_RETENTION_DAYS} days"
else
  # Daily backups: keep for 7 days
  deleted=$(find "$OUT_DIR" -name "${NAME_PREFIX}-backup-*.tar.gz" -type f -mtime +${DAILY_RETENTION_DAYS} -delete -print 2>/dev/null | wc -l || echo "0")
  echo "  Removed $deleted daily backups older than ${DAILY_RETENTION_DAYS} days"
fi

echo "Retention policy applied."

