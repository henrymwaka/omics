# ===============================================================
# omics/urls.py
# Root URL routing for the ResLab Omics Platform
# ===============================================================

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import LandingView

# === Swagger / OpenAPI ===
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="ResLab Omics Platform API",
        default_version="v1",
        description="Endpoints for managing Omics projects, samples, and data files",
        contact=openapi.Contact(email="support@reslab.dev"),
        license=openapi.License(name="Apache 2.0"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# -----------------------------------------------------------------
# URL Patterns
# -----------------------------------------------------------------
urlpatterns = [
    # === Landing page ===
    path("", LandingView.as_view(), name="landing"),

    # === Admin ===
    path("admin/", admin.site.urls),

    # === Core API ===
    # /api/ → all REST endpoints from omics_core (projects, samples, files, organisms, tissues, drafts, etc.)
    path("api/", include("omics_core.urls")),

    # === Extra / legacy API app (if you still use it) ===
    path("api/extra/", include("api.urls")),

    # === HTML test/debug pages from omics_core ===
    path("core/", include("omics_core.urls")),

    # === Raw JSON schema ===
    path(
        "api/swagger.json",
        schema_view.without_ui(cache_timeout=0),
        name="schema-swagger-json",
    ),
    path(
        "api/openapi.json",
        schema_view.without_ui(cache_timeout=0),
        name="schema-openapi-json",
    ),

    # === API Docs ===
    path(
        "api/docs/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="redoc-ui",
    ),
]

# -----------------------------------------------------------------
# Static & Media (for development)
# -----------------------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
