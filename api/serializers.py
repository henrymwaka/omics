from rest_framework import serializers
from omics_core.models import Project, Sample, OmicsFile


class OmicsFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OmicsFile
        fields = "__all__"


class SampleSerializer(serializers.ModelSerializer):
    files = OmicsFileSerializer(many=True, read_only=True)

    class Meta:
        model = Sample
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    samples = SampleSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = "__all__"
