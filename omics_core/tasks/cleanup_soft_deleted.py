# omics_core/tasks/cleanup_soft_deleted.py
#
# Celery task to permanently purge soft deleted projects and samples
# that have been in the trash for more than 30 days.

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from omics_core.models import Project, Sample


@shared_task(name="omics_core.tasks.cleanup_soft_deleted.purge_soft_deleted")
def purge_soft_deleted():
    """
    Permanently delete soft deleted samples and projects older than 30 days.

    Samples are removed before projects to keep foreign key cascades clean.
    """
    cutoff = timezone.now() - timedelta(days=30)

    # Purge samples
    Sample.objects.filter(
        is_active=False,
        deleted_at__lt=cutoff,
    ).delete()

    # Purge projects
    Project.objects.filter(
        is_active=False,
        deleted_at__lt=cutoff,
    ).delete()
