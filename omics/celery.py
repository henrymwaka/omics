# ===============================================================
# omics/celery.py
# ResLab Omics Platform Celery Configuration
# ===============================================================

import os
import logging
from celery import Celery
from celery.signals import after_setup_logger, worker_ready, worker_init

# -------------------------------------------------------------------
# Django settings
# -------------------------------------------------------------------
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omics.settings")

# Logger
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Celery app
# -------------------------------------------------------------------
app = Celery("omics")

# Load CELERY_* settings from Django settings.py
app.config_from_object("django.conf:settings", namespace="CELERY")

# Explicit autodiscover for your task modules
app.autodiscover_tasks([
    "omics_core",
    "omics_core.tasks",
])


# -------------------------------------------------------------------
# Logging hooks
# -------------------------------------------------------------------
@after_setup_logger.connect
def setup_loggers(logger=None, *args, **kwargs):
    logger.info("Celery logger initialized.")


# -------------------------------------------------------------------
# Worker init diagnostics
# -------------------------------------------------------------------
@worker_init.connect
def worker_init_handler(**kwargs):
    """
    Runs the moment Celery worker boots.
    Confirms that tasks were loaded correctly.
    """
    logger.info("Celery worker starting…")
    logger.info("Registered tasks:")
    for name in sorted(app.tasks.keys()):
        logger.info(f"  - {name}")


# -------------------------------------------------------------------
# Worker ready (full startup done)
# -------------------------------------------------------------------
@worker_ready.connect
def worker_ready_handler(**kwargs):
    """
    Confirms redis connectivity and lists task modules.
    """
    logger.info("Celery worker is fully ready.")
    logger.info("Broker URL: %s", app.connection().as_uri())

    try:
        conn = app.connection()
        conn.connect()
        logger.info("Redis broker OK and reachable.")
        conn.release()
    except Exception as e:
        logger.error("Redis broker connection FAILED: %s", e)


# -------------------------------------------------------------------
# Debug task (unchanged)
# -------------------------------------------------------------------
@app.task(bind=True)
def debug_task(self):
    logger.info(f"Debug task request: {self.request!r}")
    return {"status": "ok", "request": str(self.request)}
