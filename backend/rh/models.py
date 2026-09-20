import uuid
from django.db import models
from django.contrib import admin

class RhSituationMatrimoniale(models.Model):
    sm_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sm_nom = models.CharField("Nom", max_length=50, unique=True)

    def __str__(self):
        return self.sm_nom

    class Meta:
        db_table = 'rh_situation_matrimoniale'
        # ⚠️ STUB TEMPORAIRE

class RhClassification(models.Model):
    cla_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cla_nom = models.CharField("Nom", max_length=100, unique=True)

    def __str__(self):
        return self.cla_nom

    class Meta:
        db_table = 'rh_classification'
        # ⚠️ STUB TEMPORAIRE

@admin.register(RhSituationMatrimoniale)
class RhSituationMatrimonialeAdmin(admin.ModelAdmin):
    list_display = ("sm_nom",)

@admin.register(RhClassification)
class RhClassificationAdmin(admin.ModelAdmin):
    list_display = ("cla_nom",)