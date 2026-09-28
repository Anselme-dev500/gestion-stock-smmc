import uuid
from django.db import models
from django.contrib import admin


class RhEtablissement(models.Model):
    etab_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    etab_code = models.CharField("Code", max_length=30, unique=True)
    etab_nom = models.CharField("Nom", max_length=150)

    def __str__(self):
        return self.etab_nom

    class Meta:
        db_table = "rh_etablissement"
        # ⚠️ STUB TEMPORAIRE — à remplacer par le vrai fichier de l'encadreur


@admin.register(RhEtablissement)
class RhEtablissementAdmin(admin.ModelAdmin):
    list_display = ("etab_code", "etab_nom")
    search_fields = ("etab_code", "etab_nom")
