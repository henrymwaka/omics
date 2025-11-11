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

# ---------------------- Organism Serializer ---------------------
class OrganismSerializer(serializers.ModelSerializer):
    """Basic serializer for the Organism model (taxonomy reference)."""

    class Meta:
        model = Organism
        fields = ["id", "scientific_name", "common_name", "kingdom", "taxonomy_id"]


# ---------------------- Tissue Type Serializer ------------------
class TissueTypeSerializer(serializers.ModelSerializer):
    """Controlled vocabulary for tissue types, linked to kingdom."""

    class Meta:
        model = TissueType
        fields = ["id", "name", "kingdom", "ontology_id"]


# ---------------------- Omics File Serializer -------------------
class OmicsFileSerializer(serializers.ModelSerializer):
    """Serializer for uploaded omics data files."""

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


# ---------------------- Sample Serializer -----------------------
class SampleSerializer(serializers.ModelSerializer):
    """
    Serializer for biological samples, linked to controlled vocabularies.

    - Includes organism, tissue_type, and nested OmicsFile data.
    - `files` is linked via the related_name in the model.
    """

    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    files = OmicsFileSerializer(many=True, read_only=True)

    organism = serializers.PrimaryKeyRelatedField(
        queryset=Organism.objects.all(), allow_null=True, required=False
    )
    tissue_type = serializers.PrimaryKeyRelatedField(
        queryset=TissueType.objects.all(), allow_null=True, required=False
    )

    organism_name = serializers.SerializerMethodField()
    tissue_type_name = serializers.SerializerMethodField()

    def get_organism_name(self, obj):
        return obj.organism.scientific_name if obj.organism else None

    def get_tissue_type_name(self, obj):
        return obj.tissue_type.name if obj.tissue_type else None

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
            "files",
        ]


# ---------------------- SampleDraft Serializer ------------------
class SampleDraftSerializer(serializers.ModelSerializer):
    """
    Draft samples created by the wizard before final commit.
    Mirrors SampleSerializer but without attached files.
    """

    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    organism = serializers.PrimaryKeyRelatedField(
        queryset=Organism.objects.all(), allow_null=True, required=False
    )
    tissue_type = serializers.PrimaryKeyRelatedField(
        queryset=TissueType.objects.all(), allow_null=True, required=False
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


# ---------------------- Project Serializer ----------------------
class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for omics projects, optionally including nested samples."""

    samples = SampleSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_at", "samples"]


# ---------------------- Omics Job Serializer --------------------
class OmicsJobSerializer(serializers.ModelSerializer):
    """Serializer for bioinformatics jobs (FastQC, alignment, etc.)."""

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


# ---------------------- Omics Result Serializer -----------------
class OmicsResultSerializer(serializers.ModelSerializer):
    """Serializer for processed results (output files and summaries)."""

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

