# 🧬 Omics Portal Feature Completion & Deployment Plan

**Project:** [Omics Platform](https://omics.reslab.dev)  
**Maintainer:** Henry Mwaka  
**Version:** Phase 2 → Phase 3 transition  
**Last Updated:** $(date +"%d %B %Y")

---

## 1. Current Functional Overview

| Module | Current Status | Description |
|--------|----------------|-------------|
| **Projects & Samples** | ✅ Complete | CRUD, linking, and metadata working perfectly. |
| **File Management** | ✅ Complete | FASTQ/FASTA uploads working; linked to samples. |
| **FASTQC Pipeline** | ✅ Stable | End-to-end analysis functional with GPU integration. |
| **Job Engine (Celery)** | ✅ Working | Handles async jobs, live logs, and result saving. |
| **GPU Detection** | ✅ Confirmed | Tested with NVIDIA RTX 3090, full memory reporting. |
| **Results Storage** | ✅ Working | Auto-saves HTML/ZIP files into OmicsResult table. |
| **API Docs (Swagger/Redoc)** | ✅ Active | Accessible at `/api/docs/` and `/api/redoc/`. |
| **NCBI Taxonomy Import** | ✅ Implemented | Local taxonomy tree parsed and linked to organism model. |

---

## 2. Backend Features Remaining

| Feature | Priority | Status | Description / Action |
|----------|-----------|---------|----------------------|
| **Trimmomatic (FASTQ Trimming)** | 🔥 High | ❌ Not implemented | Add `run_trimmomatic()` Celery task using `subprocess.run(["trimmomatic", ...])`. |
| **BLAST Integration** | 🔥 High | ⚙️ Partial | Install `blast+` binaries and implement `run_blast()` task with input FASTA and output report. |
| **MultiQC Aggregation** | ⚙️ Medium | ❌ Not implemented | Summarize multiple FASTQC runs; call external `multiqc` binary. |
| **ORF Finder** | ⚙️ Medium | ❌ Not implemented | Add Python-based six-frame translation with BioPython. |
| **GC Content Analyzer** | ⚙️ Low | ❌ Not implemented | Add simple base-count parser returning GC%. |
| **Gene Annotation (Entrez)** | ⚙️ Medium | ❌ Not implemented | Use NCBI E-utilities API to retrieve gene metadata from BLAST hits. |
| **Transcriptomics (DESeq2 Wrapper)** | ⚙️ Medium | ❌ Planned | Add Rscript call for differential expression, generate volcano plot JSON. |
| **Protein Analysis (BLASTp, Pfam)** | ⚙️ Medium | ❌ Planned | Extend to protein queries later (Phase 3). |
| **Automated Cleanup of Old Jobs** | ⚙️ Medium | ❌ Planned | Add periodic Celery task to remove old logs and temporary files. |

---

## 3. Frontend Feature Readiness

| Component | Status | Description | Action Needed |
|------------|---------|-------------|----------------|
| **Landing Page** | ✅ Done | Hero + workflow intro complete. | Maintain. |
| **Dashboard (Projects / Samples)** | ⚙️ Partial | Loads data but limited analytics. | Add real summary charts and status icons. |
| **Job Trigger Buttons** | ⚙️ Partial | Buttons available but limited feedback. | Add progress bars and real-time updates via `stream/`. |
| **Results Viewer (FASTQC)** | ❌ Missing | Backend ready; frontend missing iframe or summary. | Implement embedded HTML viewer. |
| **Log Streaming Console** | ❌ Missing | API working. | Add `<LogConsole>` component using `fetch('/api/jobs/:id/stream/')`. |
| **Authentication / User Accounts** | ❌ Missing | Currently open API. | Add Django JWT + frontend login form. |
| **Stats & Charts** | ⚙️ Partial | Static placeholders. | Fetch live metrics from backend `/api/metrics/`. |
| **Navigation & Routing** | ⚙️ Partial | Working but inconsistent styles. | Align all routes and UI themes. |

---

## 4. Testing Plan

### Backend Verification
```bash
# Test FastQC task
curl -s https://omics.reslab.dev/api/samples/1/jobs/latest/ | jq

# Trigger a new job
curl -X POST https://omics.reslab.dev/api/jobs/24/trigger_fastqc/

# Verify GPU check
python3 -c "from omics_core.tasks import gpu_available; print(gpu_available())"
---

## 4. Testing Plan

### Backend Verification
```bash
# Test FastQC task
curl -s https://omics.reslab.dev/api/samples/1/jobs/latest/ | jq

# Trigger a new job
curl -X POST https://omics.reslab.dev/api/jobs/24/trigger_fastqc/

# Verify GPU check
python3 -c "from omics_core.tasks import gpu_available; print(gpu_available())"

Frontend Verification

cd ~/Projects/omics/frontend
npm install
npm run dev
# Visit http://127.0.0.1:5173/

Integration Tests

1. Create new sample with FASTQ file.


2. Run FastQC and view progress on /jobs/latest/.


3. Check /api/results/ for HTML/ZIP outputs.


4. Download and verify reports open correctly.


5. Confirm logs stream properly on /api/jobs/:id/stream/.




---

5. Deployment Checklist

Task	Command	Frequency

Pull latest code	git pull origin main	Before deploy
Update deps	pip install -r requirements.txt	Weekly
Collect static files	python manage.py collectstatic --noinput	Each deploy
Restart backend	sudo systemctl restart omics.service	Each deploy
Restart Celery	sudo systemctl restart celery-omics.service celerybeat-omics.service	Each deploy
Check health	curl -I https://omics.reslab.dev/api/	After deploy



---

6. Phase 3 Vision (2026 Release)

Module	Description

Auto Workflow Builder	Chain QC → Trim → Align → Annotate → Report using Nextflow or Snakemake.
Interactive Dashboard	Real-time status + performance metrics with Plotly.
MultiQC Reports	Aggregated QC visualization across all samples.
User Authentication & Groups	Role-based access (admin, student, analyst).
Automated Report Generation	PDF/CSV export for each pipeline.
API Federation	Cross-link Omics data with LIMS-GT and SmartField via BrAPI endpoints.
Containerized Jobs	Run analysis pipelines inside isolated Docker containers.



---

7. Immediate Action Items (Henry’s Focus)

1. ✅ Finalize and test live FastQC frontend link.


2. ⚙️ Build BLAST task with result export.


3. ⚙️ Add Trimmomatic pipeline for read cleaning.


4. ⚙️ Integrate FASTQC HTML iframe viewer in frontend.


5. ⚙️ Prepare demo dataset for presentation.


6. ⚙️ Add “Omics Analysis Guide” to /docs/.


7. ✅ Keep Celery logs auto-cleaned and GPU monitoring active.




---

