import uuid
from django.db import models
from django.contrib import admin


class RhDepartement(models.Model):
    """ Département - Département du personnel """
    dep_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dep_nom = models.CharField("Nom", max_length=100, unique=True, db_index=True)
    dep_nom_court = models.CharField("Nom court", max_length=20, null=True, blank=True)
    dep_actif = models.BooleanField("Actif", default=True)
    dep_description = models.CharField("Description", max_length=150, blank=True, null=True)
    dep_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    dep_created_by = models.IntegerField("Créateur", default=1)
    dep_updated_at = models.DateTimeField("Date modification", auto_now=True)
    dep_updated_by = models.IntegerField("Modificateur", default=1)

    def __str__(self):
        return f'{self.dep_nom}'

    class Meta:
        db_table = 'rh_departement'
        ordering = ("dep_nom", "dep_actif")


@admin.register(RhDepartement)
class RhDepartementAdmin(admin.ModelAdmin):
    list_display = ("dep_nom", "dep_nom_court", "dep_actif", "dep_id")
    search_fields = ("dep_nom__icontains",)
    list_per_page = 20
