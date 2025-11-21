# ===============================================================
# omics/urls.py
# Root URL routing for the ResLab Omics Platform (SPA + API)
# ===============================================================

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# ===============================================================
# API ROUTES
# ===============================================================

urlpatterns = [
    path("admin/", admin.site.urls),
    # Core API (use the full API router)
    path("api/", include("api.urls")),

    # Extra or legacy API
    path("api/extra/", include("api.urls")),

    # Auth API
    path("api/auth/", include("users.urls")),

    # JWT (optional)
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# ===============================================================
# SPA FRONTEND (React)
# ===============================================================

urlpatterns += [
    re_path(
        r"^(?!api/)(?:.*)/?$",
        TemplateView.as_view(template_name="index.html"),
        name="spa-entry",
    ),
]

# ===============================================================
# STATIC & MEDIA (DEBUG MODE ONLY)
# ===============================================================

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
