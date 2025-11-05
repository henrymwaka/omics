from django.contrib import admin
from .models import Project, Sample, OmicsFile


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ("sample_id", "project", "organism", "data_type")
    list_filter = ("data_type", "organism")
    search_fields = ("sample_id",)


@admin.register(OmicsFile)
class OmicsFileAdmin(admin.ModelAdmin):
    list_display = ("file", "sample", "file_type", "uploaded_at", "size_bytes")
    list_filter = ("file_type",)
    search_fields = ("file",)
