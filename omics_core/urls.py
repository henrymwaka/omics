# ===============================================================
# omics_core/urls.py
# ResLab Omics Platform API Routing
# ===============================================================

from django.urls import path, include
from django.shortcuts import get_object_or_404, render
from rest_framework.routers import DefaultRouter
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

from . import views
from .models import OmicsJob

# ===============================================================
# ROUTER SETUP FOR CRUD ENDPOINTS
# ===============================================================
router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")
router.register(r"samples", views.SampleViewSet, basename="sample")
router.register(r"files", views.OmicsFileViewSet, basename="file")
router.register(r"sample-drafts", views.SampleDraftViewSet, basename="sample-draft")
router.register(r"jobs", views.OmicsJobViewSet, basename="omics-job")
router.register(r"results", views.OmicsResultViewSet, basename="omics-result")
router.register(r"organisms", views.OrganismViewSet, basename="organism")
router.register(r"tissues", views.TissueTypeViewSet, basename="tissue")

# ===============================================================
# OPENAPI / SWAGGER CONFIGURATION
# ===============================================================
schema_view = get_schema_view(
    openapi.Info(
        title="ResLab Omics Platform API",
        default_version="v1",
        description="Programmatic interface for projects, samples, organisms, tissues, jobs, and results.",
        terms_of_service="https://reslab.dev/terms/",
        contact=openapi.Contact(email="support@reslab.dev"),
        license=openapi.License(name="Apache 2.0"),
    ),
    public=True,
    permission_classes=(AllowAny,),
    url="https://omics.reslab.dev/api/",
)

# ===============================================================
# URL PATTERNS
# ===============================================================
urlpatterns = [
    # Main API routes
    path("", include(router.urls)),

    # API documentation
    path("docs/", schema_view.with_ui("swagger", cache_timeout=0), name="swagger-docs"),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="redoc-docs"),

    # Job detail HTML view
    path(
        "jobs/<int:job_id>/",
        lambda request, job_id: render(
            request,
            "omics_core/job_detail.html",
            {"job": get_object_or_404(OmicsJob, id=job_id)},
        ),
        name="job_detail",
    ),
]
