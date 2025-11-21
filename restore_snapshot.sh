#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Snapshot Restore Utility
# Restores project files to a chosen snapshot version.
# Works with snapshots stored in Git or as local archives.
# ===============================================================

SNAPSHOT_DIR="snapshots"
RESTORE_PATH="$(pwd)"
cd "$(dirname "$0")" || exit 1

bold=$(tput bold)
normal=$(tput sgr0)
blue=$(tput setaf 4)
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
gray=$(tput setaf 7)

function color_echo() {
  color=$1; shift
  echo "${color}${*}${normal}"
}

clear
color_echo "$blue" "=============================================================="
color_echo "$blue" "♻️  OMICS PLATFORM SNAPSHOT RESTORE UTILITY"
color_echo "$blue" "=============================================================="
echo
echo "${bold}Project:${normal} $RESTORE_PATH"
echo "${bold}Date:${normal} $(date '+%Y-%m-%d %H:%M:%S')"
echo

if [ ! -d "$SNAPSHOT_DIR" ]; then
  color_echo "$red" "No snapshot directory found. Nothing to restore."
  exit 0
fi

SNAPSHOTS=($(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.zip 2>/dev/null))
if [ ${#SNAPSHOTS[@]} -eq 0 ]; then
  color_echo "$red" "No snapshot archives found in $SNAPSHOT_DIR"
  exit 0
fi

# --------------------------
# 1. Choose snapshot
# --------------------------
if command -v fzf >/dev/null 2>&1; then
  color_echo "$yellow" "📁 Select a snapshot archive to restore:"
  SELECTED=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.zip | fzf --height=15 --reverse --prompt="Snapshot> ")
elif command -v gum >/dev/null 2>&1; then
  color_echo "$yellow" "📁 Select a snapshot archive to restore:"
  SELECTED=$(gum choose $(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.zip))
else
  color_echo "$yellow" "No interactive selector found. Using most recent snapshot."
  SELECTED="${SNAPSHOTS[0]}"
fi

if [ -z "$SELECTED" ]; then
  color_echo "$red" "No snapshot selected."
  exit 1
fi

color_echo "$green" "Selected: $(basename "$SELECTED")"
echo
read -rp "⚠️  This will overwrite current working files. Continue? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  color_echo "$red" "Restore aborted."
  exit 0
fi

# --------------------------
# 2. Extract snapshot
# --------------------------
TMP_RESTORE="/tmp/omics_restore_$(date +%s)"
mkdir -p "$TMP_RESTORE"
unzip -q "$SELECTED" -d "$TMP_RESTORE"

# Find main snapshot file inside the archive
SNAP_FILE=$(find "$TMP_RESTORE" -type f -name "omics_snapshot_*.txt" | head -n 1)

if [ -z "$SNAP_FILE" ]; then
  color_echo "$red" "Snapshot file not found in archive."
  rm -rf "$TMP_RESTORE"
  exit 1
fi

# --------------------------
# 3. Git-based restore
# --------------------------
if [ -d ".git" ] && git show-ref --verify --quiet refs/heads/snapshots; then
  SNAP_TAG=$(basename "$SELECTED" .zip)
  SNAP_TAG="${SNAP_TAG/omics_snapshot_/snapshot_}"
  color_echo "$yellow" "Attempting Git restore from tag: $SNAP_TAG"

  if git rev-parse "$SNAP_TAG" >/dev/null 2>&1; then
    git stash push -u -m "Pre-restore $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1
    git checkout snapshots -q
    git checkout "$SNAP_TAG" -q
    git checkout "$SNAP_TAG" -- . >/dev/null 2>&1
    git checkout main -q 2>/dev/null || git checkout master -q 2>/dev/null
    color_echo "$green" "Git restore complete from tag $SNAP_TAG."
  else
    color_echo "$red" "Tag $SNAP_TAG not found in Git history. Proceeding with manual file restore."
  fi
fi

# --------------------------
# 4. Manual file restore (fallback)
# --------------------------
if [ ! -d ".git" ] || [ ! git rev-parse "$SNAP_TAG" >/dev/null 2>&1 ]; then
  BACKUP_DIR="$RESTORE_PATH/backup_before_restore_$(date +%Y%m%d_%H%M)"
  mkdir -p "$BACKUP_DIR"
  color_echo "$yellow" "Backing up modified files to: $BACKUP_DIR"
  rsync -av --exclude "$SNAPSHOT_DIR" --exclude ".git" ./ "$BACKUP_DIR" >/dev/null 2>&1

  color_echo "$blue" "Restoring from snapshot..."
  rsync -av "$TMP_RESTORE"/ "$RESTORE_PATH"/ >/dev/null 2>&1
  color_echo "$green" "Manual restore complete."
fi

# --------------------------
# 5. Clean up
# --------------------------
rm -rf "$TMP_RESTORE"
color_echo "$green" "Temporary files cleaned up."

# --------------------------
# 6. Post-restore summary
# --------------------------
echo
color_echo "$blue" "=============================================================="
color_echo "$blue" "✅ RESTORE COMPLETE"
color_echo "$blue" "=============================================================="
echo "Restored snapshot: $(basename "$SELECTED")"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Backup (pre-restore): $BACKUP_DIR"
echo
color_echo "$yellow" "🧩 Tip: Review changes with 'bash show_snapshots_interactive.sh' or 'git log snapshots'"
echo
