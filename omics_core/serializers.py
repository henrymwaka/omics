# ===============================================================
# omics_core/serializers.py
# Serializers for ResLab Omics Platform
# ===============================================================

from rest_framework import serializers
from .models import (
    Project,
    Sample,
    OmicsFile,
    Organism,
    TissueType,
    SampleDraft,
    OmicsJob,
    OmicsResult,
)

# ===============================================================
# Organism Serializer
# ===============================================================

class OrganismSerializer(serializers.ModelSerializer):
    """Public facing organism search serializer."""
    db_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = Organism
        fields = ["db_id", "scientific_name", "common_name", "kingdom", "taxonomy_id"]


# ===============================================================
# Tissue Type Serializer
# ===============================================================

class TissueTypeSerializer(serializers.ModelSerializer):
    """Vocabulary for tissue types filtered by kingdom."""

    class Meta:
        model = TissueType
        fields = ["id", "name", "kingdom", "ontology_id"]


# ===============================================================
# Omics File Serializer
# ===============================================================

class OmicsFileSerializer(serializers.ModelSerializer):
    """Uploaded omics data files linked to samples."""

    class Meta:
        model = OmicsFile
        fields = [
            "id",
            "sample",
            "file_type",
            "file",
            "uploaded_at",
            "checksum",
            "size_bytes",
        ]


# ===============================================================
# Sample Serializer
# ===============================================================

class SampleSerializer(serializers.ModelSerializer):
    """
    Serializer for biological samples.
    Includes nested file records and readable organism or tissue names.
    """

    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    files = OmicsFileSerializer(many=True, read_only=True)

    organism = serializers.PrimaryKeyRelatedField(
        queryset=Organism.objects.all(),
        allow_null=True,
        required=False,
        pk_field=serializers.IntegerField(),
    )

    tissue_type = serializers.PrimaryKeyRelatedField(
        queryset=TissueType.objects.all(),
        allow_null=True,
        required=False,
        pk_field=serializers.IntegerField(),
    )

    organism_name = serializers.SerializerMethodField()
    tissue_type_name = serializers.SerializerMethodField()

    def get_organism_name(self, obj):
        if obj.organism:
            return obj.organism.scientific_name
        return None

    def get_tissue_type_name(self, obj):
        if obj.tissue_type:
            return obj.tissue_type.name
        return None

    class Meta:
        model = Sample
        fields = [
            "id",
            "project",
            "sample_id",
            "organism",
            "tissue_type",
            "organism_name",
            "tissue_type_name",
            "data_type",
            "collected_on",
            "created_at",
            "is_active",
            "deleted_at",
            "files",
        ]


# ===============================================================
# Sample Draft Serializer
# ===============================================================

class SampleDraftSerializer(serializers.ModelSerializer):
    """Temporary sample drafts stored before finalization."""

    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())

    organism = serializers.PrimaryKeyRelatedField(
        queryset=Organism.objects.all(),
        allow_null=True,
        required=False,
        pk_field=serializers.IntegerField(),
    )

    tissue_type = serializers.PrimaryKeyRelatedField(
        queryset=TissueType.objects.all(),
        allow_null=True,
        required=False,
        pk_field=serializers.IntegerField(),
    )

    organism_name = serializers.SerializerMethodField()
    tissue_type_name = serializers.SerializerMethodField()

    def get_organism_name(self, obj):
        return obj.organism.scientific_name if obj.organism else None

    def get_tissue_type_name(self, obj):
        return obj.tissue_type.name if obj.tissue_type else None

    class Meta:
        model = SampleDraft
        fields = [
            "id",
            "project",
            "organism",
            "tissue_type",
            "organism_name",
            "tissue_type_name",
            "created_at",
        ]


# ===============================================================
# Project Serializer
# ===============================================================

class ProjectSerializer(serializers.ModelSerializer):
    """Project serializer including nested sample information."""
    samples = SampleSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "is_active",
            "deleted_at",
            "samples",
        ]


# ===============================================================
# Omics Job Serializer
# ===============================================================

class OmicsJobSerializer(serializers.ModelSerializer):
    """Celery driven job serializer for FastQC and other jobs."""
    sample_id = serializers.ReadOnlyField(source="sample.sample_id")

    class Meta:
        model = OmicsJob
        fields = [
            "id",
            "sample",
            "sample_id",
            "job_type",
            "status",
            "started_at",
            "finished_at",
            "log",
            "output_path",
        ]


# ===============================================================
# Omics Result Serializer
# ===============================================================

class OmicsResultSerializer(serializers.ModelSerializer):
    """Results produced by analysis pipelines."""
    sample_id = serializers.ReadOnlyField(source="sample.sample_id")

    class Meta:
        model = OmicsResult
        fields = [
            "id",
            "sample",
            "sample_id",
            "result_type",
            "file",
            "summary_json",
            "created_at",
        ]
