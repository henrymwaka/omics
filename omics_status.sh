#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Automated Health + Snapshot + Alerts
# Performs health checks, self-tests, snapshot generation,
# and sends alerts via Email and/or Telegram on failure.
# ===============================================================

set -e
cd "$(dirname "$0")" || exit 1

SNAPSHOT_DIR="snapshots"
DATESTAMP=$(date '+%Y-%m-%d_%H-%M')
LAST_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | head -n 1 || true)
NEW_SNAPSHOT=""
ZIP_FILE=""

# ----------- ALERT SETTINGS -----------
# --- Email alert (requires mailutils or msmtp-mta) ---
ENABLE_EMAIL_ALERT=true
EMAIL_TO="admin@reslab.dev"
EMAIL_FROM="omics-monitor@reslab.dev"
EMAIL_SUBJECT="Omics Platform Health Alert"

# --- Telegram alert (requires curl) ---
ENABLE_TELEGRAM_ALERT=true
TELEGRAM_BOT_TOKEN="123456789:ABCDEF_your_bot_token_here"
TELEGRAM_CHAT_ID="123456789"  # your Telegram user or group chat ID

# ----------- COLORS -----------
bold=$(tput bold)
normal=$(tput sgr0)
blue=$(tput setaf 4)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
red=$(tput setaf 1)
gray=$(tput setaf 7)
color_echo() { color=$1; shift; echo "${color}${*}${normal}"; }

ALERT_MSG=""

# ===============================================================
# 1. SYSTEM HEALTH CHECKS
# ===============================================================
BACKEND_URL="http://127.0.0.1:8000/api/projects/"
FRONTEND_URL="http://127.0.0.1:5173"
CELERY_APP="omics"

clear
color_echo "$blue" "=============================================================="
color_echo "$blue" "🔧  OMICS PLATFORM HEALTH MONITOR & SNAPSHOT TOOL"
color_echo "$blue" "=============================================================="
echo
echo "${bold}Date:${normal} $(date '+%Y-%m-%d %H:%M:%S')"
echo

color_echo "$yellow" "🩺  Checking Services..."
API_STATUS=$(curl -s -o /tmp/api_output.json -w "%{http_code}" "$BACKEND_URL" || echo "000")
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

if [ "$API_STATUS" = "200" ]; then
  color_echo "$green" "✅ Django API reachable"
else
  color_echo "$red" "❌ API down (HTTP $API_STATUS)"
  ALERT_MSG+="❌ API unreachable ($API_STATUS)\n"
fi

if [ "$FRONT_STATUS" = "200" ]; then
  color_echo "$green" "✅ Frontend reachable"
else
  color_echo "$yellow" "⚠️  Frontend not responding"
  ALERT_MSG+="⚠️ Frontend not responding ($FRONT_STATUS)\n"
fi

if celery -A "$CELERY_APP" inspect ping >/dev/null 2>&1; then
  color_echo "$green" "✅ Celery worker active"
else
  color_echo "$red" "❌ Celery not responding"
  ALERT_MSG+="❌ Celery worker inactive\n"
fi

pgrep -f gunicorn >/dev/null && color_echo "$green" "✅ Gunicorn running" || { color_echo "$red" "❌ Gunicorn down"; ALERT_MSG+="❌ Gunicorn process missing\n"; }
pgrep -f nginx >/dev/null && color_echo "$green" "✅ Nginx running" || { color_echo "$red" "❌ Nginx down"; ALERT_MSG+="❌ Nginx not running\n"; }

echo

# ===============================================================
# 2. SELF TESTS
# ===============================================================
color_echo "$yellow" "🧪  Running Functional Self-Tests..."
if python3 manage.py shell -c "from omics_core.models import Project; print(Project.objects.count())" >/tmp/orm_test.txt 2>/dev/null; then
  ORM_COUNT=$(cat /tmp/orm_test.txt)
  color_echo "$green" "✅ ORM OK — $ORM_COUNT projects found"
else
  color_echo "$red" "❌ ORM/DB connection failed"
  ALERT_MSG+="❌ Database unreachable via ORM\n"
fi

if [ "$API_STATUS" = "200" ]; then
  if jq -e '.[0] | has("id") and has("name")' /tmp/api_output.json >/dev/null 2>&1; then
    color_echo "$green" "✅ API JSON OK"
  else
    color_echo "$yellow" "⚠️  API returned unexpected JSON"
    ALERT_MSG+="⚠️ API JSON structure mismatch\n"
  fi
fi
echo

# ===============================================================
# 3. ALERT HANDLING
# ===============================================================
if [ -n "$ALERT_MSG" ]; then
  ALERT_MSG="⚠️ *Omics Platform Health Alert* — $(date '+%Y-%m-%d %H:%M:%S')\n${ALERT_MSG}"

  # --- Email alert ---
  if [ "$ENABLE_EMAIL_ALERT" = true ]; then
    echo -e "$ALERT_MSG" | mail -s "$EMAIL_SUBJECT" -r "$EMAIL_FROM" "$EMAIL_TO" 2>/dev/null || true
  fi

  # --- Telegram alert ---
  if [ "$ENABLE_TELEGRAM_ALERT" = true ] && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "parse_mode=Markdown" \
      -d "text=${ALERT_MSG}" >/dev/null 2>&1 || true
  fi

  color_echo "$red" "🚨 ALERT SENT — please check Email/Telegram."
else
  color_echo "$green" "✅ All systems operational."
fi

# ===============================================================
# 4. SNAPSHOT GENERATION
# ===============================================================
color_echo "$yellow" "📦 Generating system snapshot..."
bash generate_project_snapshot_git.sh >/dev/null 2>&1 || true
NEW_SNAPSHOT=$(ls -t "$SNAPSHOT_DIR"/omics_snapshot_*.txt 2>/dev/null | head -n 1)
ZIP_FILE="${NEW_SNAPSHOT/.txt/.zip}"

if [ -f "$ZIP_FILE" ]; then
  color_echo "$green" "✅ Snapshot archive ready: $(basename "$ZIP_FILE")"
else
  color_echo "$red" "❌ Snapshot generation failed."
fi

# ===============================================================
# 5. SUMMARY
# ===============================================================
color_echo "$blue" "=============================================================="
color_echo "$blue" "💾  STATUS SUMMARY"
color_echo "$blue" "=============================================================="
echo "Snapshot: $(basename "$ZIP_FILE" 2>/dev/null)"
echo "Saved:    $(pwd)/$ZIP_FILE"
echo
if [ -n "$ALERT_MSG" ]; then
  color_echo "$red" "⚠️  Issues detected — alerts sent."
else
  color_echo "$green" "✅  System healthy. No alerts required."
fi
echo
