from rest_framework import viewsets
from omics_core.models import Project, Sample, OmicsFile
from .serializers import ProjectSerializer, SampleSerializer, OmicsFileSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by("-created_at")
    serializer_class = ProjectSerializer


class SampleViewSet(viewsets.ModelViewSet):
    queryset = Sample.objects.all().order_by("-created_at")
    serializer_class = SampleSerializer


class OmicsFileViewSet(viewsets.ModelViewSet):
    queryset = OmicsFile.objects.all().order_by("-uploaded_at")
    serializer_class = OmicsFileSerializer
