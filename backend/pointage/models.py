import uuid
from django.db import models
from django.contrib import admin

class ShiftPointage(models.Model):
    shpt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shpt_nom = models.CharField("Nom du shift", max_length=100)

    def __str__(self):
        return self.shpt_nom

    class Meta:
        db_table = 'pointage_shift'
        # ⚠️ STUB TEMPORAIRE — à remplacer par le vrai fichier de l'encadreur

@admin.register(ShiftPointage)
class ShiftPointageAdmin(admin.ModelAdmin):
    list_display = ("shpt_nom",)