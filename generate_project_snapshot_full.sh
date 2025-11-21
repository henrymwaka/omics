#!/bin/bash
# ===============================================================
# ResLab Omics Platform – Full Forensic Snapshot Script
# Captures complete project structure, configurations, diagnostics,
# API map, DB schema, and Docker state into a single .zip file
# ===============================================================

set -e
PROJECT_ROOT="$(pwd)"
SNAPSHOT_DIR="$PROJECT_ROOT/snapshots"
mkdir -p "$SNAPSHOT_DIR"

DATESTAMP=$(date '+%Y-%m-%d_%H-%M')
OUTPUT_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.txt"
ZIP_FILE="$SNAPSHOT_DIR/omics_snapshot_${DATESTAMP}.zip"

echo "Generating full snapshot for Omics Platform..."
echo "Output file: $OUTPUT_FILE"
echo "----------------------------------------------" > "$OUTPUT_FILE"
echo "===== OMICS PLATFORM FULL SNAPSHOT =====" >> "$OUTPUT_FILE"
echo "Generated on: $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "Host: $(hostname)" >> "$OUTPUT_FILE"
echo "User: $(whoami)" >> "$OUTPUT_FILE"
echo "Project root: $PROJECT_ROOT" >> "$OUTPUT_FILE"
echo "----------------------------------------------" >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# --------------------------
# 1. Directory Structure
# --------------------------
echo "## DIRECTORY STRUCTURE" >> "$OUTPUT_FILE"
if command -v tree &>/dev/null; then
  tree -L 3 "$PROJECT_ROOT" >> "$OUTPUT_FILE"
else
  find "$PROJECT_ROOT" -maxdepth 3 -type d >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 2. Environment Versions
# --------------------------
echo "## ENVIRONMENT INFO" >> "$OUTPUT_FILE"
{
  echo "Python: $(python3 --version 2>/dev/null)"
  echo "Django: $(python3 -m django --version 2>/dev/null)"
  echo "Celery: $(celery --version 2>/dev/null)"
  echo "Node: $(node -v 2>/dev/null)"
  echo "NPM: $(npm -v 2>/dev/null)"
  echo "Git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
} >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# --------------------------
# 3. Key Backend Files
# --------------------------
echo "## BACKEND FILES SNAPSHOT" >> "$OUTPUT_FILE"
FILES_BACKEND=(
  "manage.py"
  "omics/settings.py"
  "omics/urls.py"
  "omics_core/models.py"
  "omics_core/serializers.py"
  "omics_core/views.py"
  "omics_core/tasks.py"
  "omics_core/urls.py"
  "omics_core/forms.py"
)
for file in "${FILES_BACKEND[@]}"; do
  if [ -f "$file" ]; then
    echo "### FILE: $file" >> "$OUTPUT_FILE"
    echo "-----------------------------------" >> "$OUTPUT_FILE"
    head -n 200 "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
  fi
done

# --------------------------
# 4. Key Frontend Files
# --------------------------
echo "## FRONTEND FILES SNAPSHOT" >> "$OUTPUT_FILE"
FILES_FRONTEND=(
  "frontend/package.json"
  "frontend/vite.config.js"
  "frontend/src/pages/Dashboard.jsx"
  "frontend/src/pages/Wizard.jsx"
  "frontend/src/pages/Home.jsx"
  "frontend/src/main.jsx"
)
for file in "${FILES_FRONTEND[@]}"; do
  if [ -f "$file" ]; then
    echo "### FILE: $file" >> "$OUTPUT_FILE"
    echo "-----------------------------------" >> "$OUTPUT_FILE"
    head -n 200 "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
  fi
done

# --------------------------
# 5. API ROUTES
# --------------------------
echo "## DJANGO REST API ENDPOINTS" >> "$OUTPUT_FILE"
if python3 manage.py show_urls >/tmp/show_urls.txt 2>/dev/null; then
  cat /tmp/show_urls.txt >> "$OUTPUT_FILE"
else
  echo "⚠️  'show_urls' not available; DRF fallback used" >> "$OUTPUT_FILE"
  python3 - <<'EOF' >> "$OUTPUT_FILE" 2>/dev/null
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omics.settings")
from django import setup; setup()
from django.urls import get_resolver
for u in get_resolver().reverse_dict.keys():
    if isinstance(u, str): print(u)
EOF
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 6. Celery Diagnostics
# --------------------------
echo "## CELERY DIAGNOSTICS" >> "$OUTPUT_FILE"
echo "Celery Workers:" >> "$OUTPUT_FILE"
celery -A omics inspect ping 2>/dev/null || echo "No response" >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"
echo "Active Tasks:" >> "$OUTPUT_FILE"
celery -A omics inspect active 2>/dev/null || echo "No active tasks" >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"
echo "Scheduled Tasks:" >> "$OUTPUT_FILE"
celery -A omics inspect scheduled 2>/dev/null || echo "No scheduled tasks" >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# --------------------------
# 7. Database Schema
# --------------------------
echo "## DATABASE SCHEMA (inspectdb)" >> "$OUTPUT_FILE"
python3 manage.py inspectdb | head -n 300 >> "$OUTPUT_FILE" 2>/dev/null || echo "Database unreachable or SQLite dump only." >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# --------------------------
# 8. Uploaded Files
# --------------------------
UPLOAD_DIR="$PROJECT_ROOT/uploads"
MEDIA_DIR="$PROJECT_ROOT/media"
echo "## UPLOADS AND MEDIA SUMMARY" >> "$OUTPUT_FILE"
if [ -d "$UPLOAD_DIR" ]; then
  echo "Uploads:" >> "$OUTPUT_FILE"
  find "$UPLOAD_DIR" -type f | head -n 50 >> "$OUTPUT_FILE"
else
  echo "No uploads directory found." >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

if [ -d "$MEDIA_DIR" ]; then
  echo "Media:" >> "$OUTPUT_FILE"
  find "$MEDIA_DIR" -type f | head -n 50 >> "$OUTPUT_FILE"
else
  echo "No media directory found." >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 9. Docker Containers
# --------------------------
echo "## DOCKER STATUS" >> "$OUTPUT_FILE"
if command -v docker &>/dev/null; then
  docker ps -a >> "$OUTPUT_FILE"
  echo >> "$OUTPUT_FILE"
  docker network ls >> "$OUTPUT_FILE"
  echo >> "$OUTPUT_FILE"
  docker volume ls >> "$OUTPUT_FILE"
else
  echo "Docker not installed or unavailable." >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 10. Python Dependencies
# --------------------------
echo "## PYTHON DEPENDENCIES" >> "$OUTPUT_FILE"
if [ -d "venv" ]; then
  source venv/bin/activate
  pip freeze | grep -E "django|celery|djangorestframework|drf-yasg|pynvml" >> "$OUTPUT_FILE"
  deactivate
else
  pip freeze | grep -E "django|celery|djangorestframework|drf-yasg|pynvml" >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 11. Node Dependencies
# --------------------------
echo "## NODE DEPENDENCIES" >> "$OUTPUT_FILE"
if [ -d "frontend" ]; then
  cd frontend || exit
  npm list --depth=0 2>/dev/null | head -n 100 >> "$OUTPUT_FILE"
  cd "$PROJECT_ROOT"
else
  echo "Frontend folder not found." >> "$OUTPUT_FILE"
fi
echo >> "$OUTPUT_FILE"

# --------------------------
# 12. Git Summary
# --------------------------
echo "## GIT STATUS" >> "$OUTPUT_FILE"
git status >> "$OUTPUT_FILE" 2>/dev/null || echo "Not a git repo." >> "$OUTPUT_FILE"
git log -3 --oneline >> "$OUTPUT_FILE" 2>/dev/null || true
echo >> "$OUTPUT_FILE"

# --------------------------
# 13. System Status
# --------------------------
echo "## SYSTEM STATUS" >> "$OUTPUT_FILE"
{
  echo "Disk Usage:"
  df -h | grep -E "Filesystem|/home|/var"
  echo
  echo "Running Processes (celery, gunicorn, nginx):"
  ps aux | grep -E "celery|gunicorn|nginx" | grep -v grep
} >> "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# --------------------------
# 14. Package Info + Archiving
# --------------------------
echo "Packaging snapshot into $ZIP_FILE..."
zip -9 -j "$ZIP_FILE" "$OUTPUT_FILE" >/dev/null 2>&1 || tar -czf "${ZIP_FILE%.zip}.tar.gz" -C "$SNAPSHOT_DIR" "$(basename "$OUTPUT_FILE")"

echo "Snapshot complete."
echo "Saved at: $ZIP_FILE"
echo "----------------------------------------------"
