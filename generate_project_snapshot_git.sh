#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Snapshot + Change Tracking + Git Journal
# Creates a forensic snapshot, compares with previous one,
# and auto-commits results to a 'snapshots' branch in Git
# ===============================================================

set -e
PROJECT_ROOT="$(pwd)"
SNAPSHOT_DIR="$PROJECT_ROOT/snapshots"
mkdir -p "$SNAPSHOT_DIR"

DATESTAMP=$(date '+%Y-%m-%d_%H-%M')
OUTPUT_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.txt"
ZIP_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.zip"
CHANGE_REPORT="$SNAPSHOT_DIR/omics_changes_${DATESTAMP}.txt"

# Generate new snapshot using full diagnostic script
echo "📦 Generating new Omics Platform snapshot..."
bash generate_project_snapshot_full.sh >/dev/null 2>&1 || true

# Find previous snapshot
LAST_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | grep -v "$OUTPUT_FILE" | head -n 1)

# --------------------------
# CHANGE DETECTION
# --------------------------
if [ -n "$LAST_SNAPSHOT" ]; then
  echo "Comparing with previous snapshot: $(basename "$LAST_SNAPSHOT")"
  echo "===== CHANGE REPORT =====" > "$CHANGE_REPORT"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')" >> "$CHANGE_REPORT"
  echo "Current: $(basename "$OUTPUT_FILE")" >> "$CHANGE_REPORT"
  echo "Previous: $(basename "$LAST_SNAPSHOT")" >> "$CHANGE_REPORT"
  echo >> "$CHANGE_REPORT"

  echo "## Snapshot Differences" >> "$CHANGE_REPORT"
  diff -u "$LAST_SNAPSHOT" "$OUTPUT_FILE" | head -n 500 >> "$CHANGE_REPORT" || echo "No differences detected." >> "$CHANGE_REPORT"
else
  echo "⚠️  No previous snapshot found. Creating baseline..." | tee "$CHANGE_REPORT"
fi

zip -9 -j "$ZIP_FILE" "$OUTPUT_FILE" "$CHANGE_REPORT" >/dev/null 2>&1
echo "Snapshot and diff archived at: $ZIP_FILE"
echo

# --------------------------
# GIT AUTOMATION
# --------------------------
if [ ! -d .git ]; then
  echo "⚠️  Not a Git repository. Initializing one..."
  git init -q
  git add .gitignore >/dev/null 2>&1 || true
fi

# Store current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

# Check if 'snapshots' branch exists
if git show-ref --verify --quiet refs/heads/snapshots; then
  git checkout snapshots -q
else
  git checkout -b snapshots -q
fi

# Copy snapshot artifacts to tracked folder
git add "$SNAPSHOT_DIR" >/dev/null 2>&1
git commit -am "Snapshot on $DATESTAMP" >/dev/null 2>&1 || echo "No new changes to commit."

# Tag for easy lookup
git tag -a "snapshot_${DATESTAMP}" -m "Omics platform snapshot $DATESTAMP" >/dev/null 2>&1 || true

# Merge back to working branch safely
git checkout "$CURRENT_BRANCH" -q
echo "✅ Snapshot committed to branch 'snapshots' with tag snapshot_${DATESTAMP}"

# --------------------------
# CLEANUP & SUMMARY
# --------------------------
echo "🧾 SUMMARY"
echo "Snapshot: $(basename "$OUTPUT_FILE")"
[ -n "$LAST_SNAPSHOT" ] && echo "Compared with: $(basename "$LAST_SNAPSHOT")"
echo "Branch: snapshots"
echo "Tag: snapshot_${DATESTAMP}"
echo "Archive: $ZIP_FILE"
echo "Change report: $CHANGE_REPORT"
echo "------------------------------------------------------"
