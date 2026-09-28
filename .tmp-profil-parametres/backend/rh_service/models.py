import uuid

from django.contrib import admin
from django.db import models

from rh_departement.models import RhDepartement


class RhService(models.Model):
    """Service auquel appartient le personnel."""

    ser_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    ser_nom = models.CharField(
        "Nom",
        max_length=100,
        unique=True,
    )

    ser_nom_court = models.CharField(
        "Nom court",
        max_length=20,
        null=True,
        blank=True,
    )

    ser_departement = models.ForeignKey(
        RhDepartement,
        on_delete=models.PROTECT,
        related_name="services",
        verbose_name="Département",
    )

    ser_actif = models.BooleanField(
        "Actif",
        default=True,
    )

    ser_description = models.CharField(
        "Description",
        max_length=150,
        blank=True,
        null=True,
    )

    ser_created_at = models.DateTimeField(
        "Date création",
        auto_now_add=True,
        editable=False,
    )

    ser_created_by = models.IntegerField(
        "Créateur",
        default=1,
    )

    ser_updated_at = models.DateTimeField(
        "Date modification",
        auto_now=True,
    )

    ser_updated_by = models.IntegerField(
        "Modificateur",
        default=1,
    )

    def __str__(self):
        return self.ser_nom

    class Meta:
        db_table = "rh_service"
        ordering = ("ser_nom", "ser_actif")


@admin.register(RhService)
class RhServiceAdmin(admin.ModelAdmin):

    list_display = (
        "ser_nom",
        "ser_nom_court",
        "ser_departement",
        "ser_actif",
        "ser_id",
    )

    list_filter = (
        "ser_actif",
        "ser_departement",
    )

    search_fields = (
        "ser_nom",
        "ser_nom_court",
    )

    autocomplete_fields = (
        "ser_departement",
    )

    list_per_page = 20