import uuid
from django.db import models
from django.contrib import admin

class RhService(models.Model):
    ser_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ser_nom = models.CharField("Nom", max_length=100, unique=True)
    ser_nom_court = models.CharField("Nom court", max_length=20, null=True, blank=True)
    ser_actif = models.BooleanField("Actif", default=True)

    def __str__(self):
        return self.ser_nom

    class Meta:
        db_table = 'rh_service'
        # ⚠️ STUB TEMPORAIRE — à remplacer par le vrai fichier de l'encadreur

@admin.register(RhService)
class RhServiceAdmin(admin.ModelAdmin):
    list_display = ("ser_nom", "ser_nom_court", "ser_actif")
    search_fields = ("ser_nom",)