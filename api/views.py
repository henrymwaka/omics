# api/views.py
#
# ResLab Omics Platform
# ---------------------------------------------
# Legacy but still functional API layer mounted
# under /api/extra/ for backward compatibility.
#
# The main production API is in omics_core.views.
#
# Security policy:
#   - Safe methods (GET, HEAD, OPTIONS) are public
#   - Mutations require authentication
#
# This file now matches the same security and design
# principles used in omics_core.views so that the
# entire system behaves consistently.

from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError

from omics_core.models import Project, Sample, OmicsFile
from .serializers import ProjectSerializer, SampleSerializer, OmicsFileSerializer


# ===============================================================
# Permission class
# ===============================================================
class ReadOnlyOrAuthenticated(permissions.BasePermission):
    """
    Allows public read access but restricts write operations
    to authenticated users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


# ===============================================================
# Project API
# ===============================================================
class ProjectViewSet(viewsets.ModelViewSet):
    """
    Basic CRUD for Project.
    Results are ordered newest first.

    Anonymous users can read.
    Authenticated users can create and modify.
    """

    queryset = Project.objects.all().order_by("-created_at")
    serializer_class = ProjectSerializer
    permission_classes = [ReadOnlyOrAuthenticated]

    def perform_create(self, serializer):
        """
        Create hook for future audit or ownership logic.
        """
        serializer.save()


# ===============================================================
# Sample API
# ===============================================================
class SampleViewSet(viewsets.ModelViewSet):
    """
    CRUD for Sample.

    Provides optional server side filtering:
      ?project=<id>

    Safe methods are public.
    Write operations require login.

    Joins are optimized with select_related.
    """

    serializer_class = SampleSerializer
    permission_classes = [ReadOnlyOrAuthenticated]

    def get_queryset(self):
        qs = Sample.objects.select_related(
            "project", "organism", "tissue_type"
        ).order_by("-created_at")

        project_id = self.request.query_params.get("project")

        if project_id:
            if not project_id.isdigit():
                raise ValidationError({"project": "Project id must be numeric"})
            qs = qs.filter(project_id=project_id)

        return qs

    def perform_create(self, serializer):
        serializer.save()


# ===============================================================
# Omics File API
# ===============================================================
class OmicsFileViewSet(viewsets.ModelViewSet):
    """
    CRUD for file metadata.

    Metadata is visible to the public. Uploads require login.
    Files are ordered by most recent first.
    """

    queryset = OmicsFile.objects.select_related("sample").order_by("-uploaded_at")
    serializer_class = OmicsFileSerializer
    permission_classes = [ReadOnlyOrAuthenticated]

    def perform_create(self, serializer):
        sample = serializer.validated_data.get("sample")
        if sample is None:
            raise ValidationError({"sample": "Sample is required for file upload"})
        serializer.save()
