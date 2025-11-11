flowchart TD
    subgraph U["🧑‍🔬 User Interface — omics.reslab.dev"]
        A1["Landing Page<br/>“What would you like to do today?”"]
        A2["Intelligent Router<br/>(Detects FASTA, CSV, VCF, etc.)"]
        A1 --> A2
    end

    subgraph M["🧩 Functional Modules (Django Apps)"]
        M1["Sequence Explorer<br/>DNA/RNA Upload, GC, ORF, BLAST"]
        M2["RNAi / CRISPR Designer<br/>siRNA, gRNA, Visualization"]
        M3["Transcriptome Analyzer<br/>Expression Data, DESeq2"]
        M4["Protein Insight<br/>BLASTp, Pfam, GO Annotation"]
        M5["Visualization Studio<br/>Charts, PCA, Heatmaps"]
        M6["Project Dashboard<br/>User Accounts, Reports"]
    end

    subgraph I["🔗 Integration Layer"]
        I1["LIMS-GT<br/>Lab Metadata"]
        I2["SmartField<br/>Field Phenotype Data"]
        I3["siRNA.reslab.dev<br/>Construct Design Service"]
        I4["ODK-X Sync Endpoint<br/>Data Synchronization"]
        I5["External APIs<br/>NCBI / UniProt / Pfam / Ensembl"]
    end

    subgraph B["⚙️ Backend Infrastructure"]
        B1["Django + DRF Backend"]
        B2["PostgreSQL 15<br/>(+FDW to ODK-X DB)"]
        B3["Celery + Redis<br/>(Background Jobs)"]
        B4["Gunicorn + Nginx + HTTPS (Cloudflare Tunnel)"]
        B5["Ubuntu 22.04 Server (Proxmox VM)"]
    end

    %% Connections
    A2 --> M
    M --> I
    I --> B
    A1 -. guides .-> M6
    I1 & I2 & I3 & I4 & I5 --> B1
    B1 --> B2
    B1 --> B3
    B3 --> B4
    B4 --> B5
