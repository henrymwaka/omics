# 🧬 Omics Portal — ResLab Bioinformatics System

**URL:** [https://omics.reslab.dev](https://omics.reslab.dev)  
**Maintained by:** Henry Mwaka | ResLab Omics Project  
**Status:** Active Development (Phase 2)

---

## 🌐 Overview

**Omics Portal** is the **bioinformatics hub of the ResLab ecosystem**, designed to guide scientists, students, and developers through end-to-end omics workflows — from raw data upload to visualization and interpretation.

It intelligently connects molecular biology, computational pipelines, and laboratory information systems to accelerate genomics, transcriptomics, and proteomics research across Uganda and beyond.

---

## 🧭 Vision

> “To make bioinformatics accessible, intelligent, and locally deployable — empowering African research laboratories to analyze and interpret biological data with autonomy and speed.”

Omics Portal is being developed as a **modular web platform** that integrates multiple ResLab systems:

| System | Function |
|---------|-----------|
| [LIMS-GT](https://narolims.reslab.dev) | Laboratory Information Management for Genotyping |
| [SmartField Dashboard](https://smartfield.reslab.dev) | Field data and phenotyping analytics |
| [siRNA Designer](https://sirna.reslab.dev) | RNA interference & CRISPR construct design |
| [ODK-X Sync Endpoint](https://odkx.reslab.dev) | Mobile-server data synchronization |
| [ResLab Portal](https://reslab.dev) | Central institutional gateway |

---

## ⚙️ Core Features (in progress)

| Category | Current Status | Description |
|-----------|----------------|-------------|
| **Landing Interface** | 🔄 In progress | Intelligent landing page suggesting workflows (“What would you like to do today?”). |
| **Sequence Analysis** | 🧫 Planned | Upload FASTA/FASTQ for GC content, BLAST, ORF detection, and gene annotation. |
| **RNAi / CRISPR Design** | ✅ Functional prototype | Integrates with *sirna.reslab.dev* for gRNA/siRNA design and visualization. |
| **Transcriptomics Tools** | 🧠 Planned | Differential expression (DESeq2), volcano plots, heatmaps, and clustering. |
| **Protein Analysis** | 🧬 Planned | BLASTp, Pfam, GO annotation, and structure visualization. |
| **Data Visualization** | ⚙️ Partial | Interactive plots using Plotly and Chart.js for gene and sample statistics. |
| **Integration Layer** | ✅ Active | Connects to LIMS-GT, SmartField, and ODK-X backend APIs. |
| **User Accounts** | 🧑‍🔬 Pending | Secure login, project management, and saved analyses. |
| **Reporting** | 🧾 Planned | Auto-generated analysis reports in PDF/CSV formats. |

---

## 🏗️ System Architecture

| omics.reslab.dev                                                 |
| ---------------------------------------------------------------- |
| Django backend (Gunicorn + Nginx + PostgreSQL)                   |
| Modular apps: ui / datasets / analytics / pipelines / api        |
| +--------------------------------------------------------------+ |
       │
       ├── LIMS-GT (Genotyping data)
       ├── SmartField Dashboard (Field data)
       ├── siRNA Designer (Construct design)
       ├── ODK-X Sync Endpoint (Data collection)
       └── External APIs (NCBI, BLAST, Pfam, UniProt)

All modules communicate via REST APIs. The system can be deployed locally or cloud-hosted, with HTTPS access through **Cloudflare Tunnels**.

---

## 💡 Typical User Workflows

### 1. **Sequence Analysis**
Upload DNA/RNA sequences → BLAST search → annotate genes → download reports.

### 2. **RNAi / CRISPR Construct Design**
Paste or upload sequences → generate siRNAs/gRNAs → visualize targets → export oligos.

### 3. **Transcriptomics**
Upload count tables → run DE analysis → visualize volcano/heatmap → export results.

### 4. **Integration with Lab Records**
Link sequence data with laboratory metadata from LIMS-GT for traceability.

---

## 🧰 Tech Stack

| Component | Technology |
|------------|-------------|
| **Backend Framework** | Django 5.x (Python 3.12) |
| **Frontend** | HTML5, TailwindCSS, Chart.js |
| **Database** | PostgreSQL 15 |
| **Visualization** | Plotly / D3.js |
| **Task Queue** | Celery + Redis (planned) |
| **Server** | Nginx + Gunicorn on Ubuntu 22.04 |
| **Tunnel** | Cloudflare Zero Trust |
| **Version Control** | GitHub (`henrymwaka/omics`) |

---

## 🧩 Directory Structure

omics/
├── apps/
│ ├── ui/ → Frontend pages and templates
│ ├── analytics/ → Data visualization modules
│ ├── datasets/ → File upload and management
│ ├── pipelines/ → Bioinformatics scripts (future)
│ └── api/ → REST endpoints
├── static/css/ → Stylesheets (dashboard.css)
├── templates/ → Base and dashboard HTML templates
├── manage.py
└── README.md
---

## 🚀 Local Development Setup

```bash
# Clone the repository
git clone https://github.com/henrymwaka/omics.git
cd omics

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and start server
python manage.py migrate
python manage.py runserver


---

## 🧬 NCBI Taxonomy Integration

The Omics Platform uses local NCBI Taxonomy data to enrich metadata during sample registration and organism selection.  
This dataset is required for taxonomy lookups but **should never be tracked in Git** due to its large size.

### Source
- **NCBI Taxonomy Dump:** [https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/new_taxdump.zip](https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/new_taxdump.zip)

### Local Setup
1. Download the latest dump:
   ```bash
   cd ~/Projects/omics
   wget https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/new_taxdump.zip -P ncbi_taxdump/
   unzip ncbi_taxdump/new_taxdump.zip -d ncbi_taxdump/

2. Import taxonomy data into the local database:

python manage.py import_ncbi_taxonomy ncbi_taxdump/


3. The system will populate tables with organism names, ranks, and lineage data for use in sample creation forms.



Notes

The ncbi_taxdump/ folder and new_taxdump.zip file are excluded via .gitignore to prevent large-file commits.

A backup copy can be stored in /mnt/data/archives/ for local reference.

Only metadata derived from these files (e.g., taxonomy tables) are persisted in the database.



---

## 🗄️ Data Management Policy

The Omics Platform follows a structured data management approach to balance performance, reproducibility, and repository integrity.

### 1. File Storage Policy
| Category | Storage Location | Git Tracking | Backup Policy |
|-----------|------------------|---------------|----------------|
| **System Code, Scripts, and Configs** | `/home/shaykins/Projects/omics` | ✅ Yes | GitHub repository |
| **User Uploads, FASTQ/FASTA Data** | `/mnt/data/omics/media/uploads/` | ❌ No | Mirrored daily to `/mnt/data/backups/` |
| **Analysis Outputs (FASTQC, BLAST, etc.)** | `/mnt/data/omics/media/analysis/` | ❌ No | Auto-clean every 30 days (archived selectively) |
| **Reference Databases (NCBI, Pfam, UniProt, etc.)** | `/mnt/data/archives/` | ❌ No | Updated periodically via scripts |
| **Temporary Processing Files** | `/mnt/data/omics/media/tmp/` | ❌ No | Automatically purged after each job |

All large or generated files are excluded via `.gitignore`. Only configuration, scripts, and metadata schemas are version-controlled.

### 2. Git Repository Policy
- Repositories must **never include files exceeding 50 MB**.  
- Use Git LFS only for small, persistent binaries (e.g., icons, static assets).  
- Each commit must reflect reproducible code or metadata—not datasets.

### 3. Backup and Recovery
- Daily local backups are stored under `/mnt/data/backups/`.  
- Weekly off-site backups are synchronized with the ResLab secure archive.  
- Backup files follow the convention: `projectname_backup_YYYYMMDD_HHMM`.

### 4. Data Reproducibility
- Every analysis step (e.g., FASTQC, BLAST, DESeq2) creates a reproducible `metadata.json` record.  
- These records capture parameters, input hashes, and timestamps for traceability.  
- Results can be regenerated from metadata using the workflow runner.

