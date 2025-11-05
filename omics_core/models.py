from django.db import models
from django.utils import timezone


class Project(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Sample(models.Model):
    DATA_TYPES = [
        ("DNA", "DNA-seq"),
        ("RNA", "RNA-seq"),
        ("META", "Metagenomics"),
        ("PROT", "Proteomics"),
        ("METAB", "Metabolomics"),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="samples")
    sample_id = models.CharField(max_length=100, unique=True)
    organism = models.CharField(max_length=200)
    tissue_type = models.CharField(max_length=200, blank=True)
    data_type = models.CharField(max_length=10, choices=DATA_TYPES)
    collected_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.sample_id


class OmicsFile(models.Model):
    FILE_TYPES = [
        ("FASTQ", "FASTQ reads"),
        ("BAM", "Aligned reads"),
        ("VCF", "Variant calls"),
        ("GFF", "Genome annotation"),
        ("COUNTS", "Expression counts"),
        ("META", "Metadata table"),
        ("OTHER", "Other"),
    ]
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name="files")
    file_type = models.CharField(max_length=10, choices=FILE_TYPES)
    file = models.FileField(upload_to="uploads/%Y/%m/%d/")
    uploaded_at = models.DateTimeField(default=timezone.now)
    checksum = models.CharField(max_length=64, blank=True)
    size_bytes = models.BigIntegerField(default=0)

    def __str__(self):
        return f"{self.sample.sample_id} [{self.file_type}]"
