"""
ResLab Omics Platform - Unified Django Settings
Production-ready settings for omics.reslab.dev
Deployed under Nginx + Gunicorn + Cloudflare.
"""

from pathlib import Path
from datetime import timedelta

# ---------------------------------------------------------------------
# BASE PATHS
# ---------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------
# SECURITY CONFIGURATION
# ---------------------------------------------------------------------
SECRET_KEY = "django-insecure-aisbjh0#dngj#zn66rpl90mys+fr1!xy%8xk72ur9gggbslz=w"

DEBUG = True  # change to False in production

ALLOWED_HOSTS = [
    "omics.reslab.dev",
    "www.omics.reslab.dev",
    "127.0.0.1",
    "localhost",
]

# ---------------------------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------------------------
INSTALLED_APPS = [
    # Django core apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Tools
    "django_celery_beat",
    "django_extensions",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_yasg",

    # Local apps
    "omics_core",
    "uploads",
    "analytics",
    "api",
    "users",
]

# ---------------------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ---------------------------------------------------------------------
# URLS / WSGI
# ---------------------------------------------------------------------
ROOT_URLCONF = "omics.urls"
WSGI_APPLICATION = "omics.wsgi.application"

# ---------------------------------------------------------------------
# TEMPLATES
# ---------------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "frontend" / "dist",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------
# DATABASE
# ---------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "/mnt/data/omics/db/db.sqlite3",
    }
}

# ---------------------------------------------------------------------
# PASSWORD VALIDATION
# ---------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Kampala"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------
# STATIC AND MEDIA
# ---------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = "/mnt/data/omics/static"

STATICFILES_DIRS = [
    BASE_DIR / "frontend" / "dist",
]

MEDIA_ROOT = "/home/shaykins/Projects/omics/media"
MEDIA_URL = "/media/"

# ---------------------------------------------------------------------
# REST FRAMEWORK (JWT Cookie Authentication)
# ---------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.auth.CookieJWTAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# ---------------------------------------------------------------------
# SIMPLE JWT
# ---------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ALGORITHM": "HS256",
}

# Auth cookie names
AUTH_COOKIE = "access_token"
AUTH_COOKIE_REFRESH = "refresh_token"

# Cookie flags
AUTH_COOKIE_SECURE = True
AUTH_COOKIE_HTTP_ONLY = True
AUTH_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

# ---------------------------------------------------------------------
# SECURITY AND HEADERS
# ---------------------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# ---------------------------------------------------------------------
# PROXY AWARENESS (Cloudflare)
# ---------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_TRUSTED_ORIGINS = [
    "https://omics.reslab.dev",
    "https://www.omics.reslab.dev",
]

# ---------------------------------------------------------------------
# DEFAULT SETTINGS
# ---------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------
# CELERY CONFIGURATION
# ---------------------------------------------------------------------
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Kampala"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE = True

# ---------------------------------------------------------------------
# CELERY BEAT SCHEDULE (SOFT DELETE PURGE)
# ---------------------------------------------------------------------
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "purge_soft_deleted_daily": {
        "task": "omics_core.tasks.cleanup_soft_deleted.purge_soft_deleted",
        "schedule": crontab(minute=0, hour=2),  # run daily at 02:00
    },
}

# ---------------------------------------------------------------------
# LOGGING CONFIGURATION
# ---------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": "/mnt/data/omics/logs/django.log",
            "formatter": "verbose",
        },
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["file", "console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["file", "console"],
            "level": "INFO",
            "propagate": True,
        },
        "django.request": {
            "handlers": ["file"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
