# omics_core/tasks/run_fastqc.py
#
# Celery task to run FastQC on a sample FASTQ file and
# register the outputs as OmicsResult records.

import os
import subprocess
import logging
from pathlib import Path
import zipfile

from celery import shared_task
from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.utils import timezone

from omics_core.models import OmicsJob, OmicsFile, OmicsResult

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# FASTQC BINARY
# --------------------------------------------------------------------------

def _get_fastqc_binary() -> str:
    """
    Locate the FastQC executable. Prefer /usr/bin/fastqc, fallback to PATH.
    """
    default_path = "/usr/bin/fastqc"

    if os.path.isfile(default_path) and os.access(default_path, os.X_OK):
        return default_path

    from shutil import which
    path = which("fastqc")
    if not path:
        raise RuntimeError(
            "FastQC binary not found at /usr/bin/fastqc and not present on PATH"
        )

    return path


# --------------------------------------------------------------------------
# FASTQC SUMMARY PARSERS
# --------------------------------------------------------------------------

def _parse_summary_text(text: str) -> dict:
    """
    Parse the content of summary.txt into a dict:
        {module_name: PASS/WARN/FAIL}
    """
    summary = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status, module_name = parts[0].strip(), parts[1].strip()
        summary[module_name] = status
    return summary


def _summarize_from_file(path: Path) -> dict:
    """Parse an on-disk summary.txt file."""
    if not path.exists():
        return {}

    try:
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        return _parse_summary_text(text)
    except Exception as exc:
        logger.warning("Could not read summary file %s: %s", path, exc)
        return {}


def _summarize_from_zip(zip_path: Path) -> dict:
    """
    Read summary.txt from inside ZIP if the extracted directory doesn't exist.
    """
    if not zip_path.exists():
        return {}

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            # Find the summary.txt inside the ZIP
            candidates = [
                name for name in zf.namelist() if name.endswith("summary.txt")
            ]

            if not candidates:
                logger.warning("ZIP %s does not contain summary.txt", zip_path)
                return {}

            member = candidates[0]
            with zf.open(member) as fh:
                text = fh.read().decode("utf-8", errors="ignore")

        return _parse_summary_text(text)

    except Exception as exc:
        logger.warning("Could not parse summary from ZIP %s: %s", zip_path, exc)
        return {}


# --------------------------------------------------------------------------
# COMPUTE OVERALL STATUS
# --------------------------------------------------------------------------

def _overall_from_summary(summary: dict) -> str:
    if not summary:
        return "UNKNOWN"

    values = {str(v).upper() for v in summary.values()}

    if "FAIL" in values:
        return "FAIL"
    if "WARN" in values:
        return "WARN"
    if values == {"PASS"}:
        return "PASS"

    return "UNKNOWN"


# --------------------------------------------------------------------------
# MAIN TASK
# --------------------------------------------------------------------------

@shared_task(bind=True, name="omics_core.tasks.run_fastqc.run_fastqc")
def run_fastqc(self, job_id: int) -> dict:
    """
    Run FastQC for the FASTQ file attached to OmicsJob(job_type="FASTQC").
    Process:
        - find FASTQ
        - run FastQC
        - save HTML + ZIP
        - extract summary.txt (from folder or ZIP)
        - update job.metadata["fastqc"]
    """

    logger.info("FastQC task started for job_id=%s", job_id)
    started_at = timezone.now()

    # -------------------------------------------------------
    # LOAD JOB
    # -------------------------------------------------------
    try:
        job = OmicsJob.objects.select_related("sample").get(id=job_id)
    except OmicsJob.DoesNotExist:
        return {"status": "error", "reason": "job_not_found", "job_id": job_id}

    sample = job.sample

    # Mark job running
    with transaction.atomic():
        job.status = "running"
        job.started_at = started_at
        if job.metadata is None:
            job.metadata = {}
        job.save(update_fields=["status", "started_at", "metadata"])

    # -------------------------------------------------------
    # FIND FASTQ FILE
    # -------------------------------------------------------
    fastq = (
        OmicsFile.objects.filter(sample=sample, file_type="FASTQ")
        .order_by("-uploaded_at")
        .first()
    )

    if not fastq or not fastq.file:
        msg = "No FASTQ file found for sample"
        with transaction.atomic():
            meta = job.metadata or {}
            meta.setdefault("fastqc", {})
            meta["fastqc"]["error"] = msg
            job.status = "failed"
            job.metadata = meta
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "metadata", "finished_at"])
        return {"status": "error", "reason": "no_fastq"}

    input_path = Path(fastq.file.path)
    if not input_path.exists():
        msg = f"FASTQ file missing on disk: {input_path}"
        with transaction.atomic():
            meta = job.metadata or {}
            meta.setdefault("fastqc", {})
            meta["fastqc"]["error"] = msg
            job.status = "failed"
            job.metadata = meta
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "metadata", "finished_at"])
        return {"status": "error", "reason": "fastq_missing"}

    # -------------------------------------------------------
    # RUN FASTQC
    # -------------------------------------------------------
    results_dir = Path(settings.MEDIA_ROOT) / "results" / "fastqc"
    job_dir = results_dir / f"job_{job.id}"
    job_dir.mkdir(parents=True, exist_ok=True)

    fastqc_bin = _get_fastqc_binary()
    cmd = [
        fastqc_bin,
        "--outdir", str(job_dir),
        "--quiet",
        str(input_path),
    ]

    logger.info("Executing FastQC: %s", " ".join(cmd))

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception as exc:
        msg = f"FastQC execution failed: {exc}"
        with transaction.atomic():
            meta = job.metadata or {}
            meta.setdefault("fastqc", {})
            meta["fastqc"]["error"] = msg
            job.status = "failed"
            job.metadata = meta
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "metadata", "finished_at"])
        return {"status": "error", "reason": "fastqc_exception"}

    if proc.returncode != 0:
        msg = "FastQC returned non zero exit code"
        with transaction.atomic():
            meta = job.metadata or {}
            meta.setdefault("fastqc", {})
            meta["fastqc"]["exit_code"] = proc.returncode
            meta["fastqc"]["stderr"] = proc.stderr[-3000:]
            meta["fastqc"]["stdout"] = proc.stdout[-3000:]
            job.status = "failed"
            job.metadata = meta
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "metadata", "finished_at"])
        return {"status": "error", "reason": "fastqc_non_zero"}

    # -------------------------------------------------------
    # IDENTIFY OUTPUT FILES
    # -------------------------------------------------------
    fname = input_path.name
    if fname.endswith(".gz"):
        fname = fname[:-3]
    if fname.endswith(".fastq") or fname.endswith(".fq"):
        root = fname.rsplit(".", 1)[0]
    else:
        root = fname

    html_path = job_dir / f"{root}_fastqc.html"
    zip_path = job_dir / f"{root}_fastqc.zip"
    summary_path = job_dir / f"{root}_fastqc" / "summary.txt"

    # fallback discovery
    if not html_path.exists():
        for p in job_dir.glob("*_fastqc.html"):
            html_path = p
            break

    if not zip_path.exists():
        for p in job_dir.glob("*_fastqc.zip"):
            zip_path = p
            break

    # -------------------------------------------------------
    # SAVE RESULTS (HTML + ZIP)
    # -------------------------------------------------------
    results_info = {}

    with transaction.atomic():

        # Save HTML
        if html_path.exists():
            kwargs = {"sample": sample, "result_type": "FASTQC_HTML"}
            if hasattr(OmicsResult, "job"):
                kwargs["job"] = job

            r = OmicsResult.objects.create(**kwargs)
            with html_path.open("rb") as fh:
                r.file.save(html_path.name, File(fh), save=True)
            results_info["html_result_id"] = r.id

        # Save ZIP
        if zip_path.exists():
            kwargs = {"sample": sample, "result_type": "FASTQC_ZIP"}
            if hasattr(OmicsResult, "job"):
                kwargs["job"] = job

            z = OmicsResult.objects.create(**kwargs)
            with zip_path.open("rb") as fh:
                z.file.save(zip_path.name, File(fh), save=True)
            results_info["zip_result_id"] = z.id

        # -------------------------------------------------------
        # EXTRACT SUMMARY
        # -------------------------------------------------------
        if summary_path.exists():
            summary = _summarize_from_file(summary_path)
        else:
            summary = _summarize_from_zip(zip_path)

        overall = _overall_from_summary(summary)

        # update metadata
        meta = job.metadata or {}
        meta.setdefault("fastqc", {})
        meta["fastqc"]["summary"] = summary
        meta["fastqc"]["overall_status"] = overall
        meta["fastqc"]["stderr_tail"] = proc.stderr[-2000:]
        meta["fastqc"]["stdout_tail"] = proc.stdout[-2000:]

        job.metadata = meta
        job.status = "completed"
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "finished_at", "metadata"])

    logger.info("FastQC completed for job_id=%s", job_id)

    return {
        "status": "ok",
        "job_id": job_id,
        "sample_id": sample.id,
        "html_result_id": results_info.get("html_result_id"),
        "zip_result_id": results_info.get("zip_result_id"),
        "overall_status": overall,
        "summary_modules": len(summary),
    }
