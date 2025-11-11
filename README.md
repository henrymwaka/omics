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

