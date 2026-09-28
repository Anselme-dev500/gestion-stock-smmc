"""
Migration de données — peuple RhDirection et CentreResponsabilite
à partir de l'organigramme SMMC (Direction Générale + Direction d'Appui à la Gestion).

À placer dans : backend/cdg_centre_responsabilite/migrations/0002_seed_organigramme.py
(adapte le nom du fichier précédent dans 'dependencies' si besoin)
"""
from django.db import migrations


DIRECTIONS = [
    "Direction Générale",
    "Direction d'Appui à la Gestion",
]

# (code_cr, nom_pgrm, direction, responsable)
CENTRES = [
    ("10-PO.1-M1-1", "Service Juridique", "Direction Générale", "Fransisco"),
    ("10-PO.1-M1-2", "Centrale DG", "Direction Générale", "Amir"),
    ("10-SC.9-S20-1", "Service Stocks", "Direction Générale", "Mamisoa"),
    ("10-SC.10-S27-1", "Service Communication", "Direction Générale", "Doris"),
    ("11-PO.5-S17-1", "Service Relations clients", "Direction Générale", "Hervelin"),
    ("11-EP.5-S17-1", "Service Achats", "Direction Générale", "Franki"),
    ("12-SC.7-R12-1", "Centrale Dép. Sureté", "Direction Générale", "Princesse"),
    ("13-SC.11-A24-1", "Service HSSE", "Direction Générale", "Cedric"),
    ("14-EP.2-S14-1", "Dép. Maint. des Matériels d'Exploitation", "Direction Générale", "Hugues"),
    ("15-EP.3-S15-1", "Service Ouvrages métalliques", "Direction Générale", "Mino"),
    ("15-EP.3-S15-2", "Service Infrastructures", "Direction Générale", "Precieux/Nirina"),
    ("16-EP.3-S15-1", "Service Electricité", "Direction Générale", "Léonce"),
    ("17-EP.6-R28-1", "Dép. toutes opérations - Port Vohemar", "Direction Générale", "Rolly"),
    ("18-PO.4-S13-1", "Dép. Informatique et Télécommunication", "Direction Générale", "Maxime"),

    ("20-PO.1-M1-1", "Centrale DAG", "Direction d'Appui à la Gestion", "Eddy"),
    ("21-PO.8-S26-1", "Département Contrôle de gestion", "Direction d'Appui à la Gestion", "Landry"),
    ("22-PO.9-A23-1", "Département Organisation et Audit", "Direction d'Appui à la Gestion", "Arnaud/Natha"),
    ("22-PO.9-A23-2", "Organisation", "Direction d'Appui à la Gestion", "Christian"),
]


def seed_data(apps, schema_editor):
    RhDirection = apps.get_model("rh_direction", "RhDirection")
    CentreResponsabilite = apps.get_model("cdg_centre_responsabilite", "CentreResponsabilite")

    direction_map = {}
    for nom in DIRECTIONS:
        obj, _ = RhDirection.objects.get_or_create(dir_nom=nom)
        direction_map[nom] = obj

    for code, nom_pgrm, direction_nom, responsable in CENTRES:
        CentreResponsabilite.objects.get_or_create(
            cr_code=code,
            defaults={
                "cr_nom": nom_pgrm,
                "cr_direction": direction_map[direction_nom],
                "cr_responsable_nom": responsable,
            },
        )


def unseed_data(apps, schema_editor):
    CentreResponsabilite = apps.get_model("cdg_centre_responsabilite", "CentreResponsabilite")
    RhDirection = apps.get_model("rh_direction", "RhDirection")
    codes = [c[0] for c in CENTRES]
    CentreResponsabilite.objects.filter(cr_code__in=codes).delete()
    RhDirection.objects.filter(dir_nom__in=DIRECTIONS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("cdg_centre_responsabilite", "0001_initial"),
        ("rh_direction", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_data, unseed_data),
    ]