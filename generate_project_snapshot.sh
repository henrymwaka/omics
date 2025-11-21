#!/bin/bash
# ===============================================================
# ResLab Omics Platform Snapshot Script
# Captures current directory structure and key file contents
# ===============================================================

PROJECT_ROOT="$(pwd)"
OUTPUT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "===== Omics Platform Snapshot ====="
echo "Generated: $OUTPUT_DATE"
echo "Project root: $PROJECT_ROOT"
echo "-----------------------------------"

# --------------------------
# 1. Directory structure
# --------------------------
echo "## DIRECTORY STRUCTURE"
tree -L 3 "$PROJECT_ROOT"
echo

# --------------------------
# 2. Environment info
# --------------------------
echo "## ENVIRONMENT"
python3 --version 2>/dev/null
django-admin --version 2>/dev/null
celery --version 2>/dev/null
git rev-parse --abbrev-ref HEAD 2>/dev/null
echo

# --------------------------
# 3. Key backend files
# --------------------------
echo "## BACKEND FILES"
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
    echo "### FILE: $file"
    echo "-----------------------------------"
    cat "$file"
    echo -e "\n"
  fi
done

# --------------------------
# 4. Key frontend files
# --------------------------
echo "## FRONTEND FILES"
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
    echo "### FILE: $file"
    echo "-----------------------------------"
    cat "$file"
    echo -e "\n"
  fi
done

# --------------------------
# 5. Installed packages
# --------------------------
echo "## PYTHON PACKAGES"
if [ -d "venv" ]; then
  source venv/bin/activate
  pip freeze
  deactivate
else
  pip freeze
fi
echo

# --------------------------
# 6. Node packages summary
# --------------------------
echo "## NODE PACKAGES"
cd frontend || exit
npm list --depth=0 2>/dev/null
cd "$PROJECT_ROOT" || exit
echo

# --------------------------
# 7. Git summary
# --------------------------
echo "## GIT STATUS"
git status 2>/dev/null
git log -1 --oneline 2>/dev/null
echo
echo "===== END OF SNAPSHOT ====="
