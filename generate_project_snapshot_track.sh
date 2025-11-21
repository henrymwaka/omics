#!/bin/bash
# ===============================================================
# ResLab Omics Platform Snapshot + Change Tracker
# Captures system state, compares with previous snapshot,
# and outputs a summarized change report
# ===============================================================

set -e
PROJECT_ROOT="$(pwd)"
SNAPSHOT_DIR="$PROJECT_ROOT/snapshots"
mkdir -p "$SNAPSHOT_DIR"

DATESTAMP=$(date '+%Y-%m-%d_%H-%M')
OUTPUT_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.txt"
ZIP_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.zip"
CHANGE_REPORT="$SNAPSHOT_DIR/omics_changes_${DATESTAMP}.txt"

echo "=== Generating new Omics Platform snapshot with change tracking ==="
bash generate_project_snapshot_full.sh >/dev/null 2>&1 || true

# Find the newest snapshot file *before* this one
LAST_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | grep -v "$OUTPUT_FILE" | head -n 1)

if [ -z "$LAST_SNAPSHOT" ]; then
  echo "⚠️ No previous snapshot found. This will serve as the baseline." | tee "$CHANGE_REPORT"
  exit 0
fi

echo "Comparing with previous snapshot: $LAST_SNAPSHOT"
echo "--------------------------------------------" | tee "$CHANGE_REPORT"
echo "CHANGE REPORT: $(date '+%Y-%m-%d %H:%M:%S')" >> "$CHANGE_REPORT"
echo "Current snapshot: $(basename "$OUTPUT_FILE")" >> "$CHANGE_REPORT"
echo "Previous snapshot: $(basename "$LAST_SNAPSHOT")" >> "$CHANGE_REPORT"
echo >> "$CHANGE_REPORT"

# --------------------------
# 1. File-level changes
# --------------------------
echo "## FILE-LEVEL CHANGES" >> "$CHANGE_REPORT"
diff -qr "$PROJECT_ROOT" "$PROJECT_ROOT" 2>/dev/null | grep -E "Only in|differ" >> "$CHANGE_REPORT" || echo "No file differences detected." >> "$CHANGE_REPORT"
echo >> "$CHANGE_REPORT"

# --------------------------
# 2. Snapshot diff
# --------------------------
echo "## SNAPSHOT TEXT DIFFERENCES (Unified diff)" >> "$CHANGE_REPORT"
diff -u "$LAST_SNAPSHOT" "$OUTPUT_FILE" | head -n 500 >> "$CHANGE_REPORT" || echo "No differences detected in snapshot text." >> "$CHANGE_REPORT"
echo >> "$CHANGE_REPORT"

# --------------------------
# 3. Git-tracked changes
# --------------------------
if [ -d ".git" ]; then
  echo "## GIT REPO CHANGES (Uncommitted)" >> "$CHANGE_REPORT"
  git diff --stat >> "$CHANGE_REPORT" || echo "No uncommitted changes." >> "$CHANGE_REPORT"
  echo >> "$CHANGE_REPORT"
  echo "## GIT STATUS SUMMARY" >> "$CHANGE_REPORT"
  git status -s >> "$CHANGE_REPORT" || true
else
  echo "Git not initialized for this project." >> "$CHANGE_REPORT"
fi
echo >> "$CHANGE_REPORT"

# --------------------------
# 4. Compact summary for quick view
# --------------------------
echo "## SUMMARY" >> "$CHANGE_REPORT"
grep -E "Only in|differ|^+|^-" "$CHANGE_REPORT" | head -n 40 >> "$CHANGE_REPORT" || echo "No major differences." >> "$CHANGE_REPORT"

# --------------------------
# 5. Optional HTML diff (if colordiff or diff2html exists)
# --------------------------
if command -v diff2html >/dev/null 2>&1; then
  diff -u "$LAST_SNAPSHOT" "$OUTPUT_FILE" | diff2html -i stdin -o "$SNAPSHOT_DIR/omics_diff_${DATESTAMP}.html"
  echo "HTML diff generated: $SNAPSHOT_DIR/omics_diff_${DATESTAMP}.html"
fi

# --------------------------
# 6. Zip final bundle
# --------------------------
zip -9 -j "$ZIP_FILE" "$OUTPUT_FILE" "$CHANGE_REPORT" >/dev/null 2>&1
echo "Snapshot and change report archived at: $ZIP_FILE"
echo "--------------------------------------------"
