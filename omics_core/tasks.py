import os
import subprocess
import datetime
import time
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from omics_core.models import OmicsJob, Sample, OmicsFile

# ===============================================================
# GPU CHECK
# ===============================================================
@shared_task
def gpu_available():
    """Check for NVIDIA GPU availability, compatible with all NVML versions."""
    try:
        import pynvml
        pynvml.nvmlInit()
        count = pynvml.nvmlDeviceGetCount()
        if count == 0:
            return "No GPU devices detected."
        lines = []
        for i in range(count):
            h = pynvml.nvmlDeviceGetHandleByIndex(i)
            name_raw = pynvml.nvmlDeviceGetName(h)
            name = name_raw.decode("utf-8") if isinstance(name_raw, (bytes, bytearray)) else str(name_raw)
            mem = pynvml.nvmlDeviceGetMemoryInfo(h)
            used = round(mem.used / (1024 ** 2))
            total = round(mem.total / (1024 ** 2))
            free = round(mem.free / (1024 ** 2))
            lines.append(
                f"GPU available: {name} | Memory used: {used}MB / {total}MB (Free: {free}MB)"
            )
        pynvml.nvmlShutdown()
        return "\n".join(lines)
    except Exception as e:
        return f"GPU check failed: {e}"


# ===============================================================
# FASTQC MULTI-FILE ANALYSIS TASK
# ===============================================================
@shared_task(bind=True)
def run_fastqc(self, sample_id):
    """Run FastQC on all FASTQ/FASTQ.GZ files linked to a sample."""
    start_time = timezone.now()

    # Create or reuse pending job record
    job, _ = OmicsJob.objects.get_or_create(
        sample_id=sample_id, job_type="FASTQC", status="pending"
    )

    # Reset old data
    job.status = "running"
    job.log = ""
    job.finished_at = None
    job.started_at = start_time

    # Attach Celery tracking metadata
    job.metadata = job.metadata or {}
    job.metadata.update(
        {
            "celery_task_id": self.request.id,
            "celery_queue": getattr(self.request, "delivery_info", {}).get("routing_key", "default"),
            "celery_retries": self.request.retries,
        }
    )
    job.save()

    try:
        sample = Sample.objects.get(id=sample_id)
        fastq_files = OmicsFile.objects.filter(sample=sample, file_type="FASTQ")
        valid_fastqs = [
            f.file.path
            for f in fastq_files
            if f.file.name.lower().endswith((".fastq", ".fastq.gz", ".fq", ".fq.gz"))
        ]
        if not valid_fastqs:
            raise FileNotFoundError("No valid FASTQ files found for this sample.")

        output_dir = os.path.join(settings.MEDIA_ROOT, "analysis", f"fastqc_{sample.sample_id}")
        os.makedirs(output_dir, exist_ok=True)

        job.output_path = output_dir
        job.log += f"{gpu_available()}\n"
        cmd = ["/usr/bin/fastqc", "-o", output_dir] + valid_fastqs
        job.log += f"$ {' '.join(cmd)}\n"
        job.save()

        # Stream subprocess output live to DB
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        last_save = time.time()

        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            job.log += line
            now = time.time()
            if now - last_save >= 5:  # save every 5 seconds
                job.save(update_fields=["log"])
                last_save = now

        stderr_output = process.stderr.read()
        if stderr_output:
            job.log += "\n[stderr]\n" + stderr_output
        process.wait()

        job.finished_at = timezone.now()
        job.status = "completed" if process.returncode == 0 else "failed"

        # Duration calculation
        job.metadata["duration_seconds"] = (
            (job.finished_at - job.started_at).total_seconds()
            if job.finished_at and job.started_at
            else None
        )
        job.save()

        if job.status == "completed":
            parse_fastqc_results.delay(sample_id, output_dir)

    except Exception as e:
        job.status = "failed"
        job.finished_at = timezone.now()
        job.log += f"\nException during FASTQC run: {e}\n"
        job.metadata["error"] = str(e)
        job.save()

    return job.status


# ===============================================================
# FASTQC RESULT PARSING TASK (HTML + ZIP)
# ===============================================================
@shared_task
def parse_fastqc_results(sample_id, output_dir):
    """Parse FastQC results and store HTML + ZIP outputs as OmicsResult entries."""
    from django.core.files import File
    from omics_core.models import OmicsResult, Sample

    sample = Sample.objects.get(id=sample_id)
    html_files = [f for f in os.listdir(output_dir) if f.endswith("_fastqc.html")]
    zip_files = [f for f in os.listdir(output_dir) if f.endswith("_fastqc.zip")]

    for html_name in html_files:
        html_path = os.path.join(output_dir, html_name)
        with open(html_path, "rb") as fh:
            result = OmicsResult(sample=sample, result_type="FASTQC_HTML")
            result.file.save(html_name, File(fh), save=True)

    for zip_name in zip_files:
        zip_path = os.path.join(output_dir, zip_name)
        with open(zip_path, "rb") as fh:
            result = OmicsResult(sample=sample, result_type="FASTQC_ZIP")
            result.file.save(zip_name, File(fh), save=True)

    return f"Saved {len(html_files)} HTML and {len(zip_files)} ZIP files."
