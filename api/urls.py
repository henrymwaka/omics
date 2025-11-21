# ===============================================================
# api/urls.py
# Central API Router for ResLab Omics Platform
# ===============================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from omics_core.views import (
    ProjectViewSet,
    SampleViewSet,
    OmicsFileViewSet,
    SampleDraftViewSet,
    OmicsJobViewSet,
    OmicsResultViewSet,
    OrganismViewSet,
    TissueTypeViewSet,
)

# -----------------------------------------------------------------
# Main API router
# -----------------------------------------------------------------
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"samples", SampleViewSet, basename="sample")
router.register(r"files", OmicsFileViewSet, basename="file")
router.register(r"sample-drafts", SampleDraftViewSet, basename="sample-draft")
router.register(r"jobs", OmicsJobViewSet, basename="omics-job")
router.register(r"results", OmicsResultViewSet, basename="omics-result")
router.register(r"organisms", OrganismViewSet, basename="organism")
router.register(r"tissues", TissueTypeViewSet, basename="tissue")

# -----------------------------------------------------------------
# OpenAPI / Swagger / ReDoc Schema configuration
# -----------------------------------------------------------------
schema_view = get_schema_view(
    openapi.Info(
        title="ResLab Omics API",
        default_version="v1",
        description="Unified API for projects, samples, jobs and omics results",
        contact=openapi.Contact(email="admin@reslab.dev"),
        license=openapi.License(name="Apache 2.0"),
    ),
    public=True,
    permission_classes=(AllowAny,),
    url="https://omics.reslab.dev/api/",
)

# -----------------------------------------------------------------
# URL patterns
# -----------------------------------------------------------------
urlpatterns = [
    # Core REST endpoints
    path("", include(router.urls)),

    # OpenAPI schema and docs
    path("schema/", schema_view.without_ui(cache_timeout=0), name="schema-json"),
    path("docs/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]
