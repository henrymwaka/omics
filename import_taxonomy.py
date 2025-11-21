import os
import sys
from django.db import transaction
from omics_core.models import Organism

# Path to the correct taxdump folder
TAXDUMP_DIR = os.path.expanduser("~/Projects/omics/ncbi_taxdump/ncbi_taxdump")

NODES = os.path.join(TAXDUMP_DIR, "nodes.dmp")
NAMES = os.path.join(TAXDUMP_DIR, "names.dmp")

KINGDOM_MAP = {
    "Viruses": "Virus",
    "Bacteria": "Bacteria",
    "Archaea": "Archaea",
    "Eukaryota": "Eukaryota",
}

PLANT_KEYWORDS = ["plantae", "viridiplantae", "streptophyta", "magnoliophyta", "angiosperms", "embryophyta"]
FUNGI_KEYWORDS = ["fungi", "dikarya", "ascomycota", "basidiomycota"]
ANIMAL_KEYWORDS = ["metazoa", "chordata", "arthropoda", "insecta", "mammalia", "aves"]

print("Loading nodes...")
nodes = {}
with open(NODES, "r") as f:
    for line in f:
        parts = [p.strip() for p in line.split("|")]
        tax_id = int(parts[0])
        parent_id = int(parts[1])
        rank = parts[2]
        nodes[tax_id] = (parent_id, rank)

print("Loading names...")
names = {}
common_names = {}

with open(NAMES, "r") as f:
    for line in f:
        parts = [p.strip() for p in line.split("|")]
        tax_id = int(parts[0])
        name = parts[1]
        name_class = parts[3]

        if name_class == "scientific name":
            names[tax_id] = name
        elif name_class == "genbank common name":
            common_names[tax_id] = name
        elif name_class == "common name" and tax_id not in common_names:
            common_names[tax_id] = name

def determine_kingdom(tax_id):
    """Walk up the tree and find kingdom."""
    visited = set()
    current = tax_id

    while current != 1 and current not in visited:
        visited.add(current)
        parent, rank = nodes.get(current, (1, None))

        name = names.get(current, "").lower()

        if any(k in name for k in PLANT_KEYWORDS):
            return "Plant"
        if any(k in name for k in FUNGI_KEYWORDS):
            return "Fungus"
        if any(k in name for k in ANIMAL_KEYWORDS):
            return "Animal"

        current = parent

    return None

print("Rebuilding Organism table...")
with transaction.atomic():
    Organism.objects.all().delete()

    bulk = []
    count = 0

    for tax_id, scientific_name in names.items():
        kingdom = determine_kingdom(tax_id)
        if not kingdom:
            continue

        bulk.append(
            Organism(
                scientific_name=scientific_name,
                common_name=common_names.get(tax_id, ""),
                kingdom=kingdom,
                taxonomy_id=tax_id,
            )
        )

        if len(bulk) == 2000:
            Organism.objects.bulk_create(bulk, ignore_conflicts=True)
            bulk = []
            count += 2000
            print(f"Imported {count} organisms...")

    if bulk:
        Organism.objects.bulk_create(bulk, ignore_conflicts=True)
        count += len(bulk)

print(f"Completed. Total imported: {count}")
