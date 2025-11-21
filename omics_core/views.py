# ===============================================================
# omics_core/views.py
# ResLab Omics Platform API Views
# ===============================================================

import os
import logging
from zipfile import ZipFile

from django.http import HttpResponse, FileResponse, Http404
from django.utils import timezone as dj_timezone
from django.db.models import Q

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from omics_core.models import (
    Project,
    Sample,
    OmicsFile,
    OmicsJob,
    OmicsResult,
    SampleDraft,
    Organism,
    TissueType,
)
from omics_core.serializers import (
    ProjectSerializer,
    SampleSerializer,
    OmicsFileSerializer,
    OmicsJobSerializer,
    OmicsResultSerializer,
    SampleDraftSerializer,
    OrganismSerializer,
    TissueTypeSerializer,
)
from omics_core.tasks.run_fastqc import run_fastqc

logger = logging.getLogger(__name__)


# ===============================================================
# PROJECT API
# ===============================================================
class ProjectViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for projects with soft delete support.
    """

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Default listing returns only active projects.
        """
        return Project.objects.filter(is_active=True).order_by("-created_at")

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete instead of physical delete.
        """
        project = self.get_object()
        project.soft_delete()
        return Response({"detail": "Project moved to trash."})

    @action(detail=False, methods=["get"], url_path="trash")
    def trash(self, request):
        """
        List soft deleted projects.
        """
        qs = Project.objects.filter(is_active=False).order_by("-deleted_at")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        """
        Restore a soft deleted project.
        """
        try:
            project = Project.objects.get(pk=pk, is_active=False)
        except Project.DoesNotExist:
            return Response(
                {"detail": "Project not found in trash."},
                status=404,
            )

        project.is_active = True
        project.deleted_at = None
        project.save(update_fields=["is_active", "deleted_at"])
        return Response({"detail": "Project restored."})


# ===============================================================
# ORGANISM API
# ===============================================================
class OrganismViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read only lookup for organisms.

    Open so the wizard can search organisms.
    """

    serializer_class = OrganismSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Organism.objects.all()

        search = self.request.query_params.get("search", "").strip()
        kingdom = self.request.query_params.get("kingdom", "").strip()

        if kingdom:
            qs = qs.filter(kingdom__iexact=kingdom)

        if search:
            qs = qs.filter(
                Q(scientific_name__icontains=search)
                | Q(common_name__icontains=search)
            )

        return qs.order_by("scientific_name")[:100]


# ===============================================================
# TISSUE TYPE API
# ===============================================================
class TissueTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read only lookup for tissue types.
    """

    serializer_class = TissueTypeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = TissueType.objects.all()
        kingdom = self.request.query_params.get("kingdom", "").strip()

        if kingdom and hasattr(TissueType, "kingdom"):
            qs = qs.filter(kingdom__iexact=kingdom)

        return qs.order_by("name")


# ===============================================================
# SAMPLE API
# ===============================================================
class SampleViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for samples with soft delete and FASTQC summary.

    Filters:
      - project : restrict list by project primary key.
    """

    serializer_class = SampleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            Sample.objects.select_related("project", "organism", "tissue_type")
            .filter(is_active=True)
        )

        project_id = self.request.query_params.get("project")
        if project_id:
            try:
                qs = qs.filter(project_id=int(project_id))
            except ValueError:
                pass

        return qs

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete instead of physical delete.
        """
        sample = self.get_object()
        sample.soft_delete()
        return Response({"detail": "Sample moved to trash."})

    @action(detail=False, methods=["get"], url_path="trash")
    def trash(self, request):
        """
        List soft deleted samples.
        Optional filter:
          - project : restrict to samples from a given project.
        """
        qs = Sample.objects.select_related("project", "organism", "tissue_type").filter(
            is_active=False
        )

        project_id = self.request.query_params.get("project")
        if project_id:
            try:
                qs = qs.filter(project_id=int(project_id))
            except ValueError:
                pass

        qs = qs.order_by("-deleted_at") if hasattr(Sample, "deleted_at") else qs
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        """
        Restore a soft deleted sample.
        """
        try:
            sample = Sample.objects.get(pk=pk, is_active=False)
        except Sample.DoesNotExist:
            return Response(
                {"detail": "Sample not found in trash."},
                status=404,
            )

        sample.is_active = True
        sample.deleted_at = None
        sample.save(update_fields=["is_active", "deleted_at"])
        return Response({"detail": "Sample restored."})

    # -----------------------------------------------------------
    # Latest FastQC result for a sample
    # -----------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="fastqc")
    def latest_fastqc(self, request, pk=None):
        sample = self.get_object()

        html = (
            OmicsResult.objects.filter(
                sample=sample,
                result_type="FASTQC_HTML",
            )
            .order_by("-created_at")
            .first()
        )
        zipf = (
            OmicsResult.objects.filter(
                sample=sample,
                result_type="FASTQC_ZIP",
            )
            .order_by("-created_at")
            .first()
        )

        if not html and not zipf:
            return Response({"detail": "No FASTQC results"}, status=404)

        generated_on = None
        if html and html.created_at:
            generated_on = html.created_at
        elif zipf and zipf.created_at:
            generated_on = zipf.created_at

        job = (
            OmicsJob.objects.filter(sample=sample, job_type="FASTQC")
            .order_by("-started_at", "-id")
            .first()
        )

        overall_status = None
        job_status = None
        job_id = None
        summary_rows = []
        summary_dict = {}

        if job:
            job_id = job.id
            job_status = job.status
            meta = job.metadata or {}
            fastqc_meta = meta.get("fastqc") or {}
            overall_status = fastqc_meta.get("overall_status")

            raw_summary = fastqc_meta.get("summary") or {}
            if isinstance(raw_summary, dict):
                summary_dict = raw_summary
            else:
                logger.warning(
                    "Unexpected FastQC summary type in metadata for sample_id=%s job_id=%s: %r",
                    sample.id,
                    job_id,
                    type(raw_summary),
                )

        if not summary_dict and zipf and zipf.file and zipf.file.name.endswith(".zip"):
            try:
                zip_path = zipf.file.path
                with ZipFile(zip_path) as zf:
                    member_name = None
                    for name in zf.namelist():
                        if name.endswith("summary.txt"):
                            member_name = name
                            break

                    if member_name:
                        raw_text = zf.read(member_name).decode(
                            "utf-8",
                            errors="ignore",
                        )
                        parsed = {}
                        for line in raw_text.splitlines():
                            line = line.strip()
                            if not line:
                                continue
                            parts = line.split("\t")
                            if len(parts) < 2:
                                continue
                            status, module_name = parts[0], parts[1]
                            parsed[module_name] = status
                        summary_dict = parsed
                    else:
                        logger.warning(
                            "No summary.txt found in FastQC ZIP for sample_id=%s job_id=%s",
                            sample.id,
                            job_id,
                        )
            except Exception as exc:
                logger.exception(
                    "Failed to parse FastQC summary from ZIP for sample_id=%s job_id=%s: %s",
                    sample.id,
                    job_id,
                    exc,
                )

        for module_name, status in summary_dict.items():
            summary_rows.append(
                {
                    "module": module_name,
                    "status": status,
                    "description": "",
                }
            )

        payload = {
            "sample_id": sample.id,
            "sample_name": sample.sample_id,
            "html_report": f"/api/results/{html.id}/html/" if html else None,
            "zip_download": f"/api/results/{zipf.id}/download-zip/" if zipf else None,
            "generated_on": generated_on,
            "overall_status": overall_status,
            "job_id": job_id,
            "job_status": job_status,
            "summary": summary_rows,
        }

        return Response(payload)

    # -----------------------------------------------------------
    # Job history for a sample
    # -----------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="jobs")
    def job_history(self, request, pk=None):
        sample = self.get_object()
        jobs = (
            OmicsJob.objects.filter(sample=sample)
            .order_by("-started_at", "-id")
            .values(
                "id",
                "job_type",
                "status",
                "started_at",
                "finished_at",
                "output_path",
            )
        )
        return Response({"sample": sample.sample_id, "jobs": list(jobs)})

    # -----------------------------------------------------------
    # Latest job object for a sample
    # -----------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="jobs/latest")
    def latest_job(self, request, pk=None):
        sample = self.get_object()
        job = (
            OmicsJob.objects.filter(sample=sample)
            .order_by("-started_at", "-id")
            .first()
        )
        if not job:
            return Response({"detail": "No jobs found"}, status=404)

        duration = None
        if job.started_at and job.finished_at:
            duration = (job.finished_at - job.started_at).total_seconds()

        output_url = None
        if job.output_path:
            base = os.path.basename(job.output_path)
            output_url = f"/media/analysis/{base}"

        return Response(
            {
                "id": job.id,
                "job_type": job.job_type,
                "status": job.status,
                "started_at": job.started_at,
                "finished_at": job.finished_at,
                "output_path": job.output_path,
                "output_url": output_url,
                "log_preview": (job.log or "")[:500],
                "duration_seconds": duration,
            }
        )


# ===============================================================
# FILE API
# ===============================================================
class OmicsFileViewSet(viewsets.ModelViewSet):
    """
    CRUD for OmicsFile objects attached to samples.
    """

    queryset = OmicsFile.objects.select_related("sample").all()
    serializer_class = OmicsFileSerializer
    permission_classes = [IsAuthenticated]


# ===============================================================
# JOB API
# ===============================================================
class OmicsJobViewSet(viewsets.ModelViewSet):
    """
    CRUD for OmicsJob objects.
    """

    serializer_class = OmicsJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Optional filters:
          - sample : restrict jobs to a given sample id
        """
        qs = OmicsJob.objects.select_related("sample").all()
        sample_id = self.request.query_params.get("sample")
        if sample_id:
            try:
                qs = qs.filter(sample_id=int(sample_id))
            except ValueError:
                pass
        return qs.order_by("-started_at", "-id")

    @action(detail=True, methods=["post"], url_path="trigger_fastqc")
    def trigger_fastqc(self, request, pk=None):
        """
        Trigger a FASTQC run for this job.
        """
        job = self.get_object()

        if job.status == "running":
            return Response(
                {
                    "message": "FASTQC already running",
                    "job_id": job.id,
                    "sample": job.sample.sample_id,
                    "status": job.status,
                    "started_at": job.started_at,
                },
                status=200,
            )

        existing_running = OmicsJob.objects.filter(
            sample=job.sample,
            job_type="FASTQC",
            status="running",
        ).exclude(id=job.id)

        if existing_running.exists():
            running_job = existing_running.first()
            return Response(
                {
                    "message": "Another FASTQC job is already running for this sample",
                    "job_id": running_job.id,
                    "sample": running_job.sample.sample_id,
                    "status": running_job.status,
                    "started_at": running_job.started_at,
                },
                status=200,
            )

        job.status = "running"
        job.started_at = dj_timezone.now()
        job.save(update_fields=["status", "started_at"])

        run_fastqc.delay(job.id)

        return Response(
            {
                "message": f"FASTQC triggered for {job.sample.sample_id}",
                "job_id": job.id,
                "status": job.status,
            },
            status=202,
        )

    @action(detail=True, methods=["get"], url_path="stream")
    def stream_log(self, request, pk=None):
        job = self.get_object()
        text = job.log or ""
        lines = text.splitlines()
        limit = int(request.query_params.get("lines", 100))

        if len(lines) > limit:
            lines = lines[-limit:]

        return HttpResponse(
            "\n".join(lines),
            content_type="text/plain",
        )


# ===============================================================
# SAMPLE DRAFT API
# ===============================================================
class SampleDraftViewSet(viewsets.ModelViewSet):
    """
    Draft records for sample entry workflows.
    """

    queryset = SampleDraft.objects.select_related("project", "user").all()
    serializer_class = SampleDraftSerializer
    permission_classes = [IsAuthenticated]


# ===============================================================
# RESULT API
# ===============================================================
class OmicsResultViewSet(viewsets.ModelViewSet):
    """
    Storage for analysis results and files.
    """

    queryset = OmicsResult.objects.select_related("sample").all()
    serializer_class = OmicsResultSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"], url_path="html")
    def serve_html(self, request, pk=None):
        r = self.get_object()
        if not r.file or not r.file.name.endswith(".html"):
            raise Http404("HTML not found")

        return FileResponse(r.file.open("rb"), content_type="text/html")

    @action(detail=True, methods=["get"], url_path="download-zip")
    def download_zip(self, request, pk=None):
        r = self.get_object()
        if not r.file or not r.file.name.endswith(".zip"):
            raise Http404("ZIP not found")

        return FileResponse(
            r.file.open("rb"),
            content_type="application/zip",
            as_attachment=True,
            filename=os.path.basename(r.file.name),
        )
