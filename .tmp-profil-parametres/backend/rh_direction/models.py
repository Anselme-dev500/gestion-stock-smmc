import uuid
from django.db import models
from django.contrib import admin

class RhDirection(models.Model):
    dir_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dir_nom = models.CharField("Nom", max_length=150, unique=True)
    dir_nom_court = models.CharField("Nom court", max_length=20, null=True, blank=True)
    dir_actif = models.BooleanField("Actif", default=True)

    def __str__(self):
        return self.dir_nom

    class Meta:
        db_table = 'rh_direction'
        ordering = ("dir_nom",)

@admin.register(RhDirection)
class RhDirectionAdmin(admin.ModelAdmin):
    list_display = ("dir_nom", "dir_nom_court", "dir_actif")
    search_fields = ("dir_nom",)