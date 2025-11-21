#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Unified Status & Health Launcher
# Checks API, Celery, and service health before generating snapshot
# ===============================================================

set -e
cd "$(dirname "$0")" || exit 1

SNAPSHOT_DIR="snapshots"
DATESTAMP=$(date '+%Y-%m-%d_%H-%M')
LAST_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | head -n 1 || true)
NEW_SNAPSHOT=""
ZIP_FILE=""

# ----------- COLORS -----------
bold=$(tput bold)
normal=$(tput sgr0)
blue=$(tput setaf 4)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
red=$(tput setaf 1)
gray=$(tput setaf 7)

color_echo() { color=$1; shift; echo "${color}${*}${normal}"; }

clear
color_echo "$blue" "=============================================================="
color_echo "$blue" "🔧  OMICS PLATFORM STATUS & SNAPSHOT LAUNCHER"
color_echo "$blue" "=============================================================="
echo
echo "${bold}Project:${normal} $(pwd)"
echo "${bold}Date:${normal} $(date '+%Y-%m-%d %H:%M:%S')"
echo

# ===============================================================
# 1. SYSTEM HEALTH CHECKS
# ===============================================================
color_echo "$yellow" "🩺  Running Health Diagnostics..."
echo

BACKEND_URL="http://127.0.0.1:8000/api/projects/"
FRONTEND_URL="http://127.0.0.1:5173"
CELERY_APP="omics"

# ---- Django API check ----
color_echo "$gray" "→ Checking Django API endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" || echo "000")
if [ "$API_STATUS" = "200" ]; then
  color_echo "$green" "✅ Django API reachable ($BACKEND_URL)"
else
  color_echo "$red" "❌ Django API unreachable (HTTP $API_STATUS)"
fi

# ---- Frontend check ----
color_echo "$gray" "→ Checking Frontend..."
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$FRONT_STATUS" = "200" ]; then
  color_echo "$green" "✅ Frontend reachable ($FRONTEND_URL)"
else
  color_echo "$yellow" "⚠️  Frontend not responding locally (HTTP $FRONT_STATUS)"
fi

# ---- Celery Worker check ----
color_echo "$gray" "→ Checking Celery worker..."
if celery -A "$CELERY_APP" inspect ping >/dev/null 2>&1; then
  color_echo "$green" "✅ Celery worker active"
else
  color_echo "$red" "❌ Celery worker not responding"
fi

# ---- Gunicorn/Nginx check ----
color_echo "$gray" "→ Checking Gunicorn and Nginx processes..."
if pgrep -f "gunicorn" >/dev/null; then
  color_echo "$green" "✅ Gunicorn running"
else
  color_echo "$red" "❌ Gunicorn not detected"
fi

if pgrep -f "nginx" >/dev/null; then
  color_echo "$green" "✅ Nginx running"
else
  color_echo "$red" "❌ Nginx not detected"
fi
echo

# ===============================================================
# 2. SNAPSHOT GENERATION
# ===============================================================
color_echo "$yellow" "📦 Generating new snapshot (full diagnostic)..."
bash generate_project_snapshot_git.sh >/dev/null 2>&1 || true

NEW_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | head -n 1)
ZIP_FILE="${NEW_SNAPSHOT/.txt/.zip}"

if [ ! -f "$NEW_SNAPSHOT" ]; then
  color_echo "$red" "Snapshot generation failed or no new file found."
  exit 1
fi

color_echo "$green" "✅ Snapshot generated: $(basename "$NEW_SNAPSHOT")"
echo

# ===============================================================
# 3. DIFFERENCE SUMMARY
# ===============================================================
if [ -n "$LAST_SNAPSHOT" ] && [ "$LAST_SNAPSHOT" != "$NEW_SNAPSHOT" ]; then
  color_echo "$yellow" "🔍 Comparing with previous snapshot..."
  diff -u "$LAST_SNAPSHOT" "$NEW_SNAPSHOT" | head -n 30 || echo "No significant differences detected."
  echo
else
  color_echo "$yellow" "ℹ️  No previous snapshot found — baseline created."
fi
echo

# ===============================================================
# 4. GIT COMMIT SUMMARY
# ===============================================================
if [ -d ".git" ]; then
  color_echo "$blue" "📁  Git Snapshot Branch Status:"
  git checkout snapshots -q 2>/dev/null || true
  git log -1 --oneline 2>/dev/null || echo "No snapshot commits yet."
  git checkout main -q 2>/dev/null || git checkout master -q 2>/dev/null || true
else
  color_echo "$red" "⚠️  Git repository not initialized."
fi
echo

# ===============================================================
# 5. FINAL SUMMARY
# ===============================================================
color_echo "$green" "=============================================================="
color_echo "$green" "✅  SYSTEM SNAPSHOT & HEALTH SUMMARY"
color_echo "$green" "=============================================================="
echo "📁  Snapshot file:      $(basename "$NEW_SNAPSHOT")"
echo "📦  Upload to ChatGPT:  $(basename "$ZIP_FILE")"
echo "📂  Location:           $(pwd)/$ZIP_FILE"
echo
echo "🕒  Created:             $(date '+%Y-%m-%d %H:%M:%S')"
echo "🔄  Compared against:    $(basename "$LAST_SNAPSHOT" 2>/dev/null || echo 'None')"
echo
color_echo "$blue" "🔹 Health Results:"
echo "   Django API:   $API_STATUS"
echo "   Frontend:     $FRONT_STATUS"
if celery -A "$CELERY_APP" inspect ping >/dev/null 2>&1; then
  echo "   Celery:       Active"
else
  echo "   Celery:       Inactive"
fi
if pgrep -f "gunicorn" >/dev/null; then
  echo "   Gunicorn:     Running"
else
  echo "   Gunicorn:     Down"
fi
if pgrep -f "nginx" >/dev/null; then
  echo "   Nginx:        Running"
else
  echo "   Nginx:        Down"
fi
echo
color_echo "$yellow" "💡 Next steps:"
echo "   1. Upload '${ZIP_FILE}' in a new ChatGPT session."
echo "   2. Ask your question — I’ll automatically restore full context."
echo
color_echo "$blue" "=============================================================="
echo "Run this whenever you want a health + state snapshot (recommended every few hours)."
echo "=============================================================="
