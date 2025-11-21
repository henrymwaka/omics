#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Interactive Snapshot Dashboard
# Colorized terminal dashboard with selectable diff view
# Requires: fzf or gum (optional), colordiff
# ===============================================================

SNAPSHOT_DIR="snapshots"
cd "$(dirname "$0")" || exit 1

# ---------- Color helpers ----------
bold=$(tput bold)
normal=$(tput sgr0)
blue=$(tput setaf 4)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
red=$(tput setaf 1)
gray=$(tput setaf 7)

function color_echo() {
  color=$1; shift
  echo "${color}${*}${normal}"
}

clear
color_echo "$blue" "=============================================================="
color_echo "$blue" "🌐  OMICS PLATFORM SNAPSHOT DASHBOARD (INTERACTIVE)"
color_echo "$blue" "=============================================================="
echo
echo "${bold}Project:${normal} $(pwd)"
echo "${bold}Date:${normal} $(date '+%Y-%m-%d %H:%M:%S')"
echo

if [ ! -d "$SNAPSHOT_DIR" ]; then
  color_echo "$red" "No snapshot directory found. Run generate_project_snapshot_git.sh first."
  exit 0
fi

SNAPSHOTS=($(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null))
if [ ${#SNAPSHOTS[@]} -eq 0 ]; then
  color_echo "$red" "No snapshots found in $SNAPSHOT_DIR."
  exit 0
fi

# ---------- Display overview ----------
color_echo "$yellow" "📊 Available Snapshots:"
printf "%-32s %-20s %-10s\n" "Snapshot File" "Timestamp" "Changes"
printf "%-32s %-20s %-10s\n" "--------------" "----------" "--------"
for file in "${SNAPSHOTS[@]}"; do
  base=$(basename "$file")
  ts=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1)
  change="${file/.txt/_changes.txt}"
  [ -f "$change" ] && flag="✅" || flag="–"
  printf "%-32s %-20s %-10s\n" "$base" "$ts" "$flag"
done
echo

# ---------- Choose snapshots for diff ----------
if command -v fzf >/dev/null 2>&1; then
  color_echo "$blue" "🔍 Select two snapshots to compare (press TAB to mark, ENTER to confirm):"
  SELECTION=($(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt | fzf -m --height=15 --reverse --prompt="Snapshots> "))
elif command -v gum >/dev/null 2>&1; then
  color_echo "$blue" "🔍 Select two snapshots to compare:"
  SELECTION=($(gum choose --no-limit $(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt)))
else
  color_echo "$yellow" "Interactive tools not found. Showing latest two snapshots by default."
  SELECTION=("${SNAPSHOTS[1]}" "${SNAPSHOTS[0]}")
fi

if [ ${#SELECTION[@]} -ne 2 ]; then
  color_echo "$red" "Please select exactly two snapshots for comparison."
  exit 1
fi

SNAP_A="${SELECTION[0]}"
SNAP_B="${SELECTION[1]}"
echo
color_echo "$green" "Comparing:"
echo "  • $(basename "$SNAP_A")"
echo "  • $(basename "$SNAP_B")"
echo

# ---------- Show diff ----------
if command -v colordiff >/dev/null 2>&1; then
  color_echo "$yellow" "🧾 Showing colorized diff (press Q to exit)..."
  colordiff -u "$SNAP_A" "$SNAP_B" | less -R
else
  color_echo "$yellow" "🧾 Showing basic diff (press Q to exit)..."
  diff -u "$SNAP_A" "$SNAP_B" | less
fi

# ---------- Git summary ----------
if [ -d ".git" ]; then
  echo
  color_echo "$blue" "📁  Snapshot Branch Overview:"
  git log snapshots --oneline -n 5 2>/dev/null || echo "No snapshot commits found."
  echo
  color_echo "$blue" "🏷️  Recent Snapshot Tags:"
  git tag -l "snapshot_*" | sort -r | head -n 10 || true
  echo
fi

color_echo "$green" "✅ Done. To capture a new state: bash generate_project_snapshot_git.sh"
echo
