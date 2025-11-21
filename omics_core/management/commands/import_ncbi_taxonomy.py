# ===============================================================
# Correct NCBI Taxonomy Importer
# Tree-based kingdom inference (accurate using nodes.dmp)
# ===============================================================

import os
from django.core.management.base import BaseCommand
from django.db import transaction
from omics_core.models import Organism

TAXDUMP_DIR = "ncbi_taxdump"


# ---------------------------------------------------------------
# CANONICAL TAXONOMIC ROOTS
# ---------------------------------------------------------------
TAXID_EUKARYOTA = 2759
TAXID_BACTERIA = 2
TAXID_ARCHAEA = 2157
TAXID_VIRUSES = 10239

# Eukaryotic kingdom refinement
PLANT_CLADES = {
    "viridiplantae",
    "streptophyta",
    "embryophyta",
    "tracheophyta",
    "magnoliophyta",
}

ANIMAL_CLADES = {
    "metazoa",
    "chordata",
    "vertebrata",
    "mammalia",
    "arthropoda",
    "animalia",
}

FUNGAL_CLADES = {
    "fungi",
    "ascomycota",
    "basidiomycota",
}


class Command(BaseCommand):
    help = "Import NCBI taxonomy using tree-based kingdom inference."

    def add_arguments(self, parser):
        parser.add_argument(
            "--taxdump-dir", default=TAXDUMP_DIR,
            help="Path to ncbi_taxdump directory"
        )
        parser.add_argument(
            "--limit", type=int, default=0,
            help="Limit number of records from rankedlineage.dmp (0 = no limit)"
        )

    # ==================================================================
    # MAIN PIPELINE
    # ==================================================================
    def handle(self, *args, **options):
        taxdump_dir = options["taxdump_dir"]
        limit = options["limit"]

        names_path = os.path.join(taxdump_dir, "names.dmp")
        rankedlineage_path = os.path.join(taxdump_dir, "rankedlineage.dmp")
        nodes_path = os.path.join(taxdump_dir, "nodes.dmp")

        if not all(os.path.exists(p) for p in [names_path, rankedlineage_path, nodes_path]):
            self.stderr.write(self.style.ERROR("Missing required NCBI dump files."))
            return

        # ----------------------------------------------------------
        # 1. Load names
        # ----------------------------------------------------------
        self.stdout.write(self.style.NOTICE("Loading names ..."))
        sci_names, common_names = self._load_names(names_path)
        self.stdout.write(self.style.SUCCESS(
            f"Loaded {len(sci_names)} scientific names, {len(common_names)} common names."
        ))

        # ----------------------------------------------------------
        # 2. Load nodes (tree)
        # ----------------------------------------------------------
        self.stdout.write(self.style.NOTICE("Loading nodes (taxonomy tree) ..."))
        parent_map = self._load_nodes(nodes_path)
        self.stdout.write(self.style.SUCCESS(
            f"Loaded {len(parent_map)} taxonomic nodes."
        ))

        # ----------------------------------------------------------
        # 3. Scan rankedlineage + infer kingdom
        # ----------------------------------------------------------
        self.stdout.write(self.style.NOTICE("Scanning rankedlineage ..."))
        records = self._scan_rankedlineage(
            rankedlineage_path, sci_names, common_names,
            parent_map, limit
        )
        self.stdout.write(self.style.SUCCESS(
            f"Prepared {len(records)} records with canonical kingdom."
        ))

        # ----------------------------------------------------------
        # 4. Deduplicate
        # ----------------------------------------------------------
        seen = set()
        dedup = []
        for r in records:
            key = r["scientific_name"].lower()
            if key not in seen:
                seen.add(key)
                dedup.append(r)

        self.stdout.write(self.style.NOTICE(
            f"De-duplicated to {len(dedup)} unique names."
        ))

        # ----------------------------------------------------------
        # 5. Detach samples → then delete Organism
        # ----------------------------------------------------------
        from omics_core.models import Sample
        self.stdout.write(self.style.NOTICE(
            "Detaching existing Sample.organism references (set to NULL) ..."
        ))
        Sample.objects.update(organism=None)

        self.stdout.write(self.style.NOTICE("Clearing Organism table ..."))
        Organism.objects.all().delete()

        # ----------------------------------------------------------
        # 6. Bulk import
        # ----------------------------------------------------------
        self.stdout.write(self.style.NOTICE(
            f"Creating {len(dedup)} Organism records ..."
        ))

        objs = [
            Organism(
                taxonomy_id=r["taxonomy_id"],
                scientific_name=r["scientific_name"],
                common_name=r["common_name"],
                kingdom=r["kingdom"],
            )
            for r in dedup
        ]

        with transaction.atomic():
            Organism.objects.bulk_create(objs, batch_size=5000)

        self.stdout.write(self.style.SUCCESS("Taxonomy import complete."))

    # ==================================================================
    # HELPERS
    # ==================================================================

    def _load_names(self, path):
        sci, common = {}, {}
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) < 4:
                    continue
                tax_id, name_txt, _, name_class = parts[:4]
                if name_class == "scientific name":
                    sci[tax_id] = name_txt
                elif name_class in {"genbank common name", "common name"}:
                    common[tax_id] = name_txt
        return sci, common

    def _load_nodes(self, path):
        """
        Build dictionary: taxid → parent_taxid
        """
        parent = {}
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) < 2:
                    continue
                tax_id = parts[0]
                parent_id = parts[1]
                parent[tax_id] = parent_id
        return parent

    # --------------------------------------------------------------
    # TREE WALKING: find canonical kingdom
    # --------------------------------------------------------------
    def _infer_kingdom(self, tax_id, parent_map, lineage_str):
        """
        Climb up the parent tree to detect the top-level kingdom.
        """

        # First check viral superkingdom 10239
        cur = tax_id
        visited = set()

        while cur and cur not in visited:
            visited.add(cur)

            # Perfect detection for viruses
            if cur == str(TAXID_VIRUSES):
                return "Virus"

            # Bacteria
            if cur == str(TAXID_BACTERIA):
                return "Bacteria"

            # Archaea
            if cur == str(TAXID_ARCHAEA):
                return "Archaea"

            # Eukaryotes
            if cur == str(TAXID_EUKARYOTA):
                # refine using lineage string
                tokens = [t.lower().strip() for t in lineage_str.split("|")]
                if any(t in PLANT_CLADES for t in tokens):
                    return "Plant"
                if any(t in ANIMAL_CLADES for t in tokens):
                    return "Animal"
                if any(t in FUNGAL_CLADES for t in tokens):
                    return "Fungus"
                return "Eukaryota"

            # move up the tree
            cur = parent_map.get(cur)

        return None  # fallback if unknown

    # --------------------------------------------------------------
    # MAIN SCAN
    # --------------------------------------------------------------
    def _scan_rankedlineage(self, path, sci_names, common_names, parent_map, limit):
        out = []
        seen_taxids = set()

        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if limit and len(out) >= limit:
                    break

                parts = [p.strip() for p in line.split("|")]
                if len(parts) < 2:
                    continue

                tax_id = parts[0]
                lineage_str = "|".join(parts[1:])

                if tax_id in seen_taxids:
                    continue

                sci = sci_names.get(tax_id)
                if not sci:
                    continue

                kingdom = self._infer_kingdom(tax_id, parent_map, lineage_str)
                if not kingdom:
                    continue

                seen_taxids.add(tax_id)
                out.append({
                    "taxonomy_id": int(tax_id),
                    "scientific_name": sci,
                    "common_name": common_names.get(tax_id, ""),
                    "kingdom": kingdom,
                })

        return out
