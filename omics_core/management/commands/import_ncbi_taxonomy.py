# ===============================================================
# omics_core/management/commands/import_ncbi_taxonomy.py
# Import NCBI taxonomy dump into the Organism table (deduplicated)
# ===============================================================

import os
from django.core.management.base import BaseCommand
from django.db import transaction
from omics_core.models import Organism

TAXDUMP_DIR = "ncbi_taxdump"

# Extended token → kingdom mapping for robust lineage detection
KINGDOM_MAP = {
    # Plants (modern clades and legacy)
    "viridiplantae": "Plant",
    "streptophyta": "Plant",
    "embryophyta": "Plant",
    "tracheophyta": "Plant",
    "magnoliophyta": "Plant",
    "plantae": "Plant",
    "eukaryota": "Plant",  # fallback for plants not explicitly tagged

    # Animals
    "metazoa": "Animal",
    "chordata": "Animal",
    "vertebrata": "Animal",
    "mammalia": "Animal",
    "arthropoda": "Animal",
    "animalia": "Animal",

    # Fungi
    "fungi": "Fungus",
    "ascomycota": "Fungus",
    "basidiomycota": "Fungus",

    # Bacteria / Archaea / Viruses
    "bacteria": "Bacteria",
    "eubacteria": "Bacteria",
    "archaea": "Archaea",
    "virus": "Virus",
    "viruses": "Virus",
}


class Command(BaseCommand):
    help = "Import NCBI taxonomy into Organism table, de-duplicated by scientific name."

    def add_arguments(self, parser):
        parser.add_argument(
            "--taxdump-dir",
            default=TAXDUMP_DIR,
            help="Path to ncbi_taxdump directory (default: ncbi_taxdump)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=300000,
            help="Maximum number of taxonomy records to consider from rankedlineage.dmp",
        )

    def handle(self, *args, **options):
        taxdump_dir = options["taxdump_dir"]
        limit = options["limit"]

        names_path = os.path.join(taxdump_dir, "names.dmp")
        rankedlineage_path = os.path.join(taxdump_dir, "rankedlineage.dmp")

        if not os.path.exists(names_path) or not os.path.exists(rankedlineage_path):
            self.stderr.write(self.style.ERROR(
                f"Missing names.dmp or rankedlineage.dmp under {taxdump_dir}"
            ))
            return

        # ------------------------------------------------------
        # 1) Load names
        # ------------------------------------------------------
        self.stdout.write(self.style.NOTICE("Loading names from names.dmp ..."))
        sci_names, common_names = self._load_names(names_path)
        self.stdout.write(self.style.SUCCESS(
            f"Loaded {len(sci_names)} scientific names, {len(common_names)} common names."
        ))

        # ------------------------------------------------------
        # 2) Scan rankedlineage.dmp and infer kingdom
        # ------------------------------------------------------
        self.stdout.write(self.style.NOTICE(
            f"Scanning rankedlineage.dmp (up to {limit} records) ..."
        ))
        records = self._scan_rankedlineage(rankedlineage_path, sci_names, common_names, limit)
        self.stdout.write(self.style.SUCCESS(f"Prepared {len(records)} records (with kingdom)."))

        if not records:
            self.stderr.write(self.style.ERROR("No organisms found to import (after filtering)."))
            return

        # ------------------------------------------------------
        # 3) De-duplicate by scientific name
        # ------------------------------------------------------
        seen = set()
        deduped = []
        for r in records:
            key = r["scientific_name"].strip().lower()
            if key not in seen:
                seen.add(key)
                deduped.append(r)
        self.stdout.write(self.style.NOTICE(
            f"De-duplicated to {len(deduped)} unique scientific names."
        ))

        # ------------------------------------------------------
        # 4) Check existing organisms in small chunks
        # ------------------------------------------------------
        CHUNK_SIZE = 500
        existing = set()
        self.stdout.write(self.style.NOTICE("Checking which scientific names already exist..."))
        for start in range(0, len(deduped), CHUNK_SIZE):
            chunk = deduped[start:start + CHUNK_SIZE]
            names_chunk = [r["scientific_name"] for r in chunk]
            for name in Organism.objects.filter(
                scientific_name__in=names_chunk
            ).values_list("scientific_name", flat=True):
                existing.add(name)

        to_create = [r for r in deduped if r["scientific_name"] not in existing]
        if not to_create:
            self.stdout.write(self.style.SUCCESS("All organisms already exist in the database."))
            return

        self.stdout.write(self.style.NOTICE(
            f"Creating {len(to_create)} new Organism records in batches..."
        ))

        # ------------------------------------------------------
        # 5) Bulk create safely
        # ------------------------------------------------------
        objs = [
            Organism(
                taxonomy_id=r["taxonomy_id"],
                scientific_name=r["scientific_name"],
                common_name=r["common_name"],
                kingdom=r["kingdom"],
            )
            for r in to_create
        ]

        with transaction.atomic():
            Organism.objects.bulk_create(objs, batch_size=1000, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Import complete."))

    # ==========================================================
    # Helpers
    # ==========================================================
    def _load_names(self, path):
        sci_names, common_names = {}, {}
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) < 4:
                    continue
                tax_id = parts[0].strip()
                name_txt = parts[1].strip()
                name_class = parts[3].strip()
                if name_class == "scientific name":
                    sci_names[tax_id] = name_txt
                elif name_class in {"genbank common name", "common name"}:
                    common_names.setdefault(tax_id, name_txt)
        return sci_names, common_names

def _infer_kingdom(self, lineage_str):
    """
    Infer one of our canonical kingdoms from a lineage string.
    Match only whole-word tokens to avoid false positives.
    """
    tokens = [t.lower().strip() for t in lineage_str.split('|') if t.strip()]
    for token in tokens:
        for key, kingdom in KINGDOM_MAP.items():
            if token == key:
                return kingdom
    return None
    def _scan_rankedlineage(self, path, sci_names, common_names, limit):
        records = []
        seen_taxids = set()
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if limit and len(records) >= limit:
                    break
                parts = [p.strip() for p in line.split("|")]
                if len(parts) < 2:
                    continue
                tax_id = parts[0].strip()
                lineage = " ".join(parts[1:]).strip()

                if tax_id in seen_taxids:
                    continue
                sci = sci_names.get(tax_id)
                if not sci:
                    continue

                kingdom = self._infer_kingdom(lineage)
                if not kingdom:
                    continue

                seen_taxids.add(tax_id)
                common = common_names.get(tax_id, "")
                try:
                    tid = int(tax_id)
                except ValueError:
                    continue

                records.append({
                    "taxonomy_id": tid,
                    "scientific_name": sci,
                    "common_name": common,
                    "kingdom": kingdom,
                })
        return records
