import uuid
from django.db import models
from django.contrib import admin
from rh_direction.models import RhDirection

class CentreResponsabilite(models.Model):
    cr_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cr_code = models.CharField("Code CR ERP", max_length=30, unique=True, db_index=True)
    cr_nom = models.CharField("Nom PGRM ERP", max_length=150)
    cr_direction = models.ForeignKey(RhDirection, on_delete=models.SET_NULL, null=True, blank=True,
                                      verbose_name="Direction", related_name="centres_responsabilite")
    cr_responsable_nom = models.CharField("Responsable (nom affiché)", max_length=100, blank=True, null=True)
    cr_actif = models.BooleanField("Actif", default=True)

    def __str__(self):
        return f"{self.cr_code} - {self.cr_nom}"

    class Meta:
        db_table = 'cdg_centre_responsabilite'
        ordering = ("cr_code",)

@admin.register(CentreResponsabilite)
class CentreResponsabiliteAdmin(admin.ModelAdmin):
    list_display = ("cr_code", "cr_nom", "cr_direction", "cr_responsable_nom", "cr_actif")
    search_fields = ("cr_code", "cr_nom")
    list_filter = ("cr_direction", "cr_actif")
    autocomplete_fields = ("cr_direction",)