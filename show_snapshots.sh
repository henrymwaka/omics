#!/bin/bash
# ===============================================================
# ResLab Omics Platform - Snapshot Dashboard Viewer
# Displays all forensic snapshots, timestamps, tags, and diffs
# ===============================================================

SNAPSHOT_DIR="snapshots"
cd "$(dirname "$0")" || exit 1

echo "=============================================================="
echo "📊  OMICS PLATFORM SNAPSHOT DASHBOARD"
echo "=============================================================="
echo "Project Path: $(pwd)"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo

# --------------------------
# 1. Snapshot List
# --------------------------
if [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "⚠️  No snapshot directory found. Run generate_project_snapshot_git.sh first."
  exit 0
fi

SNAPSHOTS=($(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null))
if [ ${#SNAPSHOTS[@]} -eq 0 ]; then
  echo "⚠️  No snapshots found in $SNAPSHOT_DIR"
  exit 0
fi

printf "%-30s %-22s %-12s\n" "Snapshot File" "Timestamp" "Change Report"
printf "%-30s %-22s %-12s\n" "--------------" "----------" "--------------"

for file in "${SNAPSHOTS[@]}"; do
  base=$(basename "$file")
  time=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1)
  change="${file/.txt/_changes.txt}"
  if [ -f "$change" ]; then
    flag="✅"
  else
    flag="–"
  fi
  printf "%-30s %-22s %-12s\n" "$base" "$time" "$flag"
done

echo
echo "Total snapshots: ${#SNAPSHOTS[@]}"
echo

# --------------------------
# 2. Latest Snapshot Summary
# --------------------------
LATEST="${SNAPSHOTS[0]}"
PREVIOUS="${SNAPSHOTS[1]}"
echo "--------------------------------------------------------------"
echo "🧾  LATEST SNAPSHOT SUMMARY"
echo "--------------------------------------------------------------"
echo "File: $(basename "$LATEST")"
echo "Taken: $(stat -c "%y" "$LATEST" 2>/dev/null | cut -d'.' -f1)"
[ -n "$PREVIOUS" ] && echo "Previous snapshot: $(basename "$PREVIOUS")"
echo

if [ -f "${LATEST/.txt/_changes.txt}" ]; then
  echo "Recent changes summary:"
  grep -E "Only in|differ|^+|^-" "${LATEST/.txt/_changes.txt}" | head -n 20 || echo "No major differences."
else
  echo "No change report for this snapshot."
fi
echo

# --------------------------
# 3. Git Snapshot History
# --------------------------
if [ -d ".git" ]; then
  echo "--------------------------------------------------------------"
  echo "📁  GIT SNAPSHOT HISTORY"
  echo "--------------------------------------------------------------"
  if git show-ref --verify --quiet refs/heads/snapshots; then
    echo "Branch: snapshots"
    echo
    git log snapshots --oneline -n 10
  else
    echo "No 'snapshots' branch found. Run snapshot generator first."
  fi
  echo
else
  echo "Git repository not initialized."
fi

# --------------------------
# 4. Tag Overview
# --------------------------
if [ -d ".git" ]; then
  echo "--------------------------------------------------------------"
  echo "🏷️  SNAPSHOT TAGS"
  echo "--------------------------------------------------------------"
  git tag -l "snapshot_*" | sort -r | head -n 15
  echo
fi

# --------------------------
# 5. Diff Preview
# --------------------------
if [ -n "$PREVIOUS" ]; then
  echo "--------------------------------------------------------------"
  echo "🔍  DIFF PREVIEW (latest vs previous)"
  echo "--------------------------------------------------------------"
  diff -u "$PREVIOUS" "$LATEST" | head -n 40 || echo "No textual differences."
else
  echo "Only one snapshot exists — no diff to show."
fi

echo
echo "=============================================================="
echo "💡 Tip: Run 'bash generate_project_snapshot_git.sh' after work sessions."
echo "=============================================================="
