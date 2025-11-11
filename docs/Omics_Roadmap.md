gantt
    dateFormat  YYYY-MM-DD
    title 🧭 Omics Project Development Roadmap — ResLab Omics System
    excludes weekends

    section Phase 1: Infrastructure Setup
    🟢 Server & Deployment (Ubuntu 22.04 + Nginx + Gunicorn):done, des1, 2025-09-15, 15d
    🟢 PostgreSQL + FDW to ODK-X Sync DB:done, des2, 2025-09-20, 10d
    🟢 Cloudflare Tunnel + HTTPS Configuration:done, des3, 2025-09-25, 7d
    🟢 GitHub Integration & Version Control:done, des4, 2025-09-30, 5d

    section Phase 2: Frontend & User Experience
    🟡 Intelligent Landing Page ("What would you like to do?"):active, des5, 2025-11-05, 14d
    🟡 Dashboard Layout, Sidebar & Navigation:active, des6, 2025-11-10, 10d
    ⚪ Theming (Dark/Light Mode, Responsive Design):des7, 2025-11-20, 10d

    section Phase 3: Core Bioinformatics Modules
    🟡 Sequence Explorer (FASTA/FASTQ + BLAST + ORF):active, des8, 2025-11-25, 21d
    ⚪ RNAi / CRISPR Designer (Integration & Off-target scoring):des9, 2025-12-15, 10d
    ⚪ Transcriptome Analyzer (DESeq2 / Visualization):des10, 2026-01-05, 25d
    ⚪ Protein Insight (Pfam, UniProt, GO):des11, 2026-01-20, 20d

    section Phase 4: Data Visualization & Reporting
    ⚪ Visualization Studio (Plotly/Chart.js):des12, 2026-02-10, 20d
    ⚪ Auto Report Builder (PDF/CSV Export):des13, 2026-02-25, 14d

    section Phase 5: User & Project Management
    ⚪ Authentication & Roles (Admin / Researcher / Guest):des14, 2026-03-10, 10d
    ⚪ Project Dashboard & History Saving:des15, 2026-03-20, 14d
    ⚪ Collaboration Features (Shared Workspaces):des16, 2026-04-05, 20d

    section Phase 6: Integrations & Intelligence
    ⚪ LIMS-GT & SmartField API Integration:des17, 2026-04-25, 14d
    ⚪ Intelligent Workflow Router (Auto tool suggestion):des18, 2026-05-05, 21d
    ⚪ Background Job Queue (Celery + Redis):des19, 2026-05-20, 10d

    section Phase 7: Final Polishing & Release
    ⚪ Full QA Testing & Documentation:des20, 2026-06-01, 10d
    ⚪ Beta Launch (Public Access):des21, 2026-06-15, 5d
    ⚪ Final Production Release:des22, 2026-07-01, 1d
