from django.db import models
from django.utils import timezone
from django.conf import settings


# ---------------------------------------------------------------
# Controlled vocabularies
# ---------------------------------------------------------------
class Organism(models.Model):
    """Standardized organism reference with taxonomy integration."""

    KINGDOM_CHOICES = [
        ("Plant", "Plant"),
        ("Animal", "Animal"),
        ("Fungus", "Fungus"),
        ("Bacteria", "Bacteria"),
        ("Virus", "Virus"),
        ("Archaea", "Archaea"),
        ("Eukaryota", "Eukaryota"),
    ]

    scientific_name = models.CharField(max_length=200, unique=True)
    common_name = models.CharField(max_length=100, blank=True)
    kingdom = models.CharField(max_length=50, choices=KINGDOM_CHOICES)
    taxonomy_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="NCBI taxonomy ID",
    )

    # Indexed lowercase field for very fast search
    search_name = models.CharField(
        max_length=200,
        default="",
        db_index=True,
        help_text="Lowercased scientific_name for fast indexed search",
    )

    def __str__(self):
        return f"{self.scientific_name} ({self.kingdom})"


class TissueType(models.Model):
    """Controlled vocabulary for anatomical or culture source."""

    KINGDOM_CHOICES = Organism.KINGDOM_CHOICES

    name = models.CharField(max_length=100)
    kingdom = models.CharField(max_length=50, choices=KINGDOM_CHOICES)
    ontology_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="UBERON or PO term ID",
    )

    class Meta:
        unique_together = ("name", "kingdom")
        ordering = ["kingdom", "name"]

    def __str__(self):
        return f"{self.name} ({self.kingdom})"


# ---------------------------------------------------------------
# Core data models
# ---------------------------------------------------------------
class Project(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    # Soft delete fields
    is_active = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def soft_delete(self):
        """Mark project as inactive without physically deleting rows."""
        if not self.is_active:
            return
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at"])

    def __str__(self):
        return self.name


class Sample(models.Model):
    """Biological sample metadata linked to controlled vocabularies."""

    DATA_TYPES = [
        ("DNA", "DNA-seq"),
        ("RNA", "RNA-seq"),
        ("META", "Metagenomics"),
        ("PROT", "Proteomics"),
        ("METAB", "Metabolomics"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="samples",
    )
    sample_id = models.CharField(max_length=100, unique=True)

    organism = models.ForeignKey(
        Organism,
        on_delete=models.PROTECT,
        related_name="samples",
        null=True,
        blank=True,
    )
    tissue_type = models.ForeignKey(
        TissueType,
        on_delete=models.PROTECT,
        related_name="samples",
        null=True,
        blank=True,
    )

    data_type = models.CharField(max_length=10, choices=DATA_TYPES)
    collected_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    # Soft delete fields
    is_active = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def soft_delete(self):
        """Mark sample as inactive without dropping linked files or jobs."""
        if not self.is_active:
            return
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at"])

    def __str__(self):
        org = self.organism.scientific_name if self.organism else "Unspecified organism"
        return f"{self.sample_id} ({org})"


class OmicsFile(models.Model):
    """Uploaded omics data files linked to samples."""

    FILE_TYPES = [
        ("FASTQ", "FASTQ reads"),
        ("BAM", "Aligned reads"),
        ("VCF", "Variant calls"),
        ("GFF", "Genome annotation"),
        ("COUNTS", "Expression counts"),
        ("META", "Metadata table"),
        ("OTHER", "Other"),
    ]

    sample = models.ForeignKey(
        Sample,
        on_delete=models.CASCADE,
        related_name="files",
    )
    file_type = models.CharField(max_length=10, choices=FILE_TYPES)
    file = models.FileField(upload_to="uploads/%Y/%m/%d/")
    uploaded_at = models.DateTimeField(default=timezone.now)
    checksum = models.CharField(max_length=64, blank=True)
    size_bytes = models.BigIntegerField(default=0)

    def __str__(self):
        return f"{self.sample.sample_id} [{self.file_type}]"


# ---------------------------------------------------------------
# Job and Result Tracking
# ---------------------------------------------------------------
class OmicsJob(models.Model):
    """Tracks processing jobs such as FastQC, alignment, variant calling."""

    JOB_TYPES = [
        ("FASTQC", "Quality Control"),
        ("ALIGN", "Read Alignment"),
        ("VARCALL", "Variant Calling"),
        ("EXPR", "Expression Analysis"),
        ("ANNOT", "Annotation"),
        ("CUSTOM", "Custom Script"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    sample = models.ForeignKey(
        Sample,
        on_delete=models.CASCADE,
        related_name="jobs",
    )
    job_type = models.CharField(max_length=50, choices=JOB_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    log = models.TextField(blank=True)
    metadata = models.JSONField(blank=True, null=True, default=dict)
    output_path = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.sample.sample_id} - {self.job_type} ({self.status})"


class OmicsResult(models.Model):
    """Stores processed output files or JSON summaries."""

    sample = models.ForeignKey(
        Sample,
        on_delete=models.CASCADE,
        related_name="results",
    )
    result_type = models.CharField(max_length=50)
    file = models.FileField(upload_to="results/")
    summary_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sample.sample_id} [{self.result_type}]"


# ---------------------------------------------------------------
# Sample Drafts
# ---------------------------------------------------------------
class SampleDraft(models.Model):
    """Stores partial sample entry progress for resuming later."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="sample_drafts",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sample_drafts",
    )

    step = models.PositiveSmallIntegerField(default=1)
    data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Draft for {self.project.name} (step {self.step})"
