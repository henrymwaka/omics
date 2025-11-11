# ===============================================================
# omics_core/views.py
# ResLab Omics Platform API Views
# ===============================================================

import os
from datetime import datetime, timezone
from django.utils import timezone as dj_timezone
from django.http import HttpResponse, FileResponse, Http404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from omics_core.models import (
    Project,
    Sample,
    OmicsFile,
    OmicsJob,
    OmicsResult,
    SampleDraft,
)
from omics_core.serializers import (
    ProjectSerializer,
    SampleSerializer,
    OmicsFileSerializer,
    OmicsJobSerializer,
    OmicsResultSerializer,
    SampleDraftSerializer,
)
from omics_core.tasks import run_fastqc


# ---------------------------------------------------------------
# Project API
# ---------------------------------------------------------------
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by("-created_at")
    serializer_class = ProjectSerializer


# ---------------------------------------------------------------
# Sample API
# ---------------------------------------------------------------
class SampleViewSet(viewsets.ModelViewSet):
    queryset = Sample.objects.select_related("project", "organism", "tissue_type").all()
    serializer_class = SampleSerializer

    @action(detail=True, methods=["get"], url_path="fastqc")
    def latest_fastqc(self, request, pk=None):
        """Return links to the latest FASTQC results for this sample."""
        sample = self.get_object()

        latest_html = (
            OmicsResult.objects.filter(sample=sample, result_type="FASTQC_HTML")
            .order_by("-id")
            .first()
        )
        latest_zip = (
            OmicsResult.objects.filter(sample=sample, result_type="FASTQC_ZIP")
            .order_by("-id")
            .first()
        )

        if not latest_html and not latest_zip:
            return Response(
                {"detail": "No FASTQC results found for this sample."},
                status=404,
            )

        return Response(
            {
                "sample_id": sample.id,
                "sample_name": sample.sample_id,
                "html_report": (
                    f"https://omics.reslab.dev/api/results/{latest_html.id}/html/"
                    if latest_html
                    else None
                ),
                "zip_download": (
                    f"https://omics.reslab.dev/api/results/{latest_zip.id}/download-zip/"
                    if latest_zip
                    else None
                ),
                "generated_on": (
                    latest_html.created_at if latest_html else latest_zip.created_at
                ),
            }
        )

    @action(detail=True, methods=["get"], url_path="jobs")
    def job_history(self, request, pk=None):
        """Return full job history for a sample."""
        sample = self.get_object()
        jobs = (
            OmicsJob.objects.filter(sample=sample)
            .order_by("-started_at")
            .values("id", "job_type", "status", "started_at", "finished_at", "output_path")
        )
        return Response({"sample": sample.sample_id, "jobs": list(jobs)})

    @action(detail=True, methods=["get"], url_path="jobs/latest")
    def latest_job(self, request, pk=None):
        """Return only the latest job for this sample."""
        sample = self.get_object()
        job = OmicsJob.objects.filter(sample=sample).order_by("-started_at").first()
        if not job:
            return Response({"detail": "No jobs found for this sample."}, status=404)

        duration = None
        if job.finished_at and job.started_at:
            duration = (job.finished_at - job.started_at).total_seconds()

        return Response(
            {
                "id": job.id,
                "job_type": job.job_type,
                "status": job.status,
                "started_at": job.started_at,
                "finished_at": job.finished_at,
                "output_path": job.output_path,
                "output_url": f"https://omics.reslab.dev/media/analysis/{os.path.basename(job.output_path)}"
                if job.output_path
                else None,
                "log_preview": (job.log or "")[:500],
                "result_html_url": "https://omics.reslab.dev/api/results/1/html/",
                "result_zip_url": "https://omics.reslab.dev/api/results/2/download-zip/",
                "duration_seconds": duration,
                "celery_task_id": getattr(job, "celery_task_id", None),
                "celery_queue": getattr(job, "celery_queue", None),
                "celery_retries": getattr(job, "celery_retries", None),
            }
        )


# ---------------------------------------------------------------
# File API
# ---------------------------------------------------------------
class OmicsFileViewSet(viewsets.ModelViewSet):
    queryset = OmicsFile.objects.select_related("sample").all()
    serializer_class = OmicsFileSerializer


# ---------------------------------------------------------------
# Job API
# ---------------------------------------------------------------
class OmicsJobViewSet(viewsets.ModelViewSet):
    queryset = OmicsJob.objects.select_related("sample").all()
    serializer_class = OmicsJobSerializer

    @action(detail=True, methods=["post"], url_path="trigger_fastqc")
    def trigger_fastqc(self, request, pk=None):
        """Trigger a new FASTQC job for this job's sample."""
        job = self.get_object()
        if job.status in ["running", "pending"]:
            return Response({"error": "Job already running or pending"}, status=400)

        job.status = "running"
        job.started_at = dj_timezone.now()
        job.save()
        run_fastqc.delay(job.sample.id)
        return Response(
            {"message": f"FASTQC job triggered for {job.sample.sample_id}"},
            status=202,
        )

    @action(detail=True, methods=["post"], url_path="rerun")
    def rerun_fastqc(self, request, pk=None):
        """Re-run FASTQC for the same sample linked to this job."""
        job = self.get_object()
        run_fastqc.delay(job.sample.id)
        return Response(
            {"message": f"FASTQC job re-triggered for {job.sample.sample_id}"},
            status=202,
        )

    @action(detail=True, methods=["get"], url_path="stream")
    def stream_log(self, request, pk=None):
        """
        Stream the most recent section of this job's log.
        Optional query parameters:
          ?lines=N        → limit output to last N lines (default 100)
          ?since=<ISO8601> → include only log lines newer than timestamp
        """
        job = self.get_object()
        log_text = job.log or ""
        lines = log_text.splitlines()

        # ?lines=N
        try:
            limit = int(request.query_params.get("lines", 100))
            if limit <= 0:
                limit = 100
        except ValueError:
            limit = 100

        # ?since=timestamp
        since_param = request.query_params.get("since")
        if since_param:
            try:
                since_dt = datetime.fromisoformat(since_param.replace("Z", "+00:00"))
                lines = [
                    ln for ln in lines
                    if datetime.now(timezone.utc) > since_dt
                ]
            except Exception:
                pass

        log_tail = "\n".join(lines[-limit:]) if lines else ""

        data = {
            "id": job.id,
            "status": job.status,
            "job_type": job.job_type,
            "updated": (job.finished_at or job.started_at).isoformat() if (job.finished_at or job.started_at) else None,
            "log_tail": log_tail,
            "line_count": len(lines),
        }
        return Response(data)


# ---------------------------------------------------------------
# Result API
# ---------------------------------------------------------------
class OmicsResultViewSet(viewsets.ModelViewSet):
    queryset = OmicsResult.objects.select_related("sample").all()
    serializer_class = OmicsResultSerializer

    @action(detail=True, methods=["get"], url_path="html")
    def html_report(self, request, pk=None):
        """Return the FastQC HTML report inline."""
        result = self.get_object()
        if result.result_type != "FASTQC_HTML" or not result.file:
            return Response(
                {"detail": "This result is not a FASTQC HTML report."},
                status=400,
            )

        file_path = result.file.path
        if not os.path.exists(file_path):
            raise Http404("Report file not found on disk.")

        with open(file_path, "rb") as fh:
            content = fh.read()

        return HttpResponse(content, content_type="text/html")

    @action(detail=True, methods=["get"], url_path="download-zip")
    def download_zip(self, request, pk=None):
        """Download the FastQC ZIP archive."""
        result = self.get_object()
        if result.result_type != "FASTQC_ZIP" or not result.file:
            return Response(
                {"detail": "This result is not a FASTQC ZIP archive."},
                status=400,
            )

        file_path = result.file.path
        if not os.path.exists(file_path):
            raise Http404("ZIP file not found on disk.")

        return FileResponse(
            open(file_path, "rb"),
            as_attachment=True,
            filename=os.path.basename(file_path),
            content_type="application/zip",
        )


# ---------------------------------------------------------------
# Sample Draft API
# ---------------------------------------------------------------
class SampleDraftViewSet(viewsets.ModelViewSet):
    queryset = SampleDraft.objects.select_related("project", "user").all()
    serializer_class = SampleDraftSerializer
