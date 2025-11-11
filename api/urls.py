# ===============================================================
# api/urls.py — Central API Router for ResLab Omics Platform
# ===============================================================

from django.urls import path, include
from rest_framework import routers
from rest_framework.permissions import AllowAny
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from omics_core.views import (
    ProjectViewSet,
    SampleViewSet,
    OmicsFileViewSet,
)

# -----------------------------------------------------------------
# API Router — explicitly define basenames for stability
# -----------------------------------------------------------------
router = routers.DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"samples", SampleViewSet, basename="sample")
router.register(r"files", OmicsFileViewSet, basename="file")

# -----------------------------------------------------------------
# OpenAPI / Swagger / ReDoc Schema configuration
# -----------------------------------------------------------------
schema_view = get_schema_view(
    openapi.Info(
        title="ResLab Omics API",
        default_version="v1",
        description="Unified API for projects, samples, and omics files",
        contact=openapi.Contact(email="admin@reslab.dev"),
        license=openapi.License(name="Apache 2.0"),
    ),
    public=True,
    permission_classes=(AllowAny,),
)

# -----------------------------------------------------------------
# URL patterns
# -----------------------------------------------------------------
urlpatterns = [
    # Core REST endpoints
    path("", include(router.urls)),

    # OpenAPI schema & interactive docs
    path("schema/", schema_view.without_ui(cache_timeout=0), name="schema-json"),
    path("docs/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

# -----------------------------------------------------------------
# 🧩 Notes:
# - All API routes now have explicit basenames (no inference issues)
# - Swagger → /api/docs/
# - ReDoc   → /api/redoc/
# - JSON schema → /api/schema/
# - Safe to reload/restart even during edits
# -----------------------------------------------------------------
