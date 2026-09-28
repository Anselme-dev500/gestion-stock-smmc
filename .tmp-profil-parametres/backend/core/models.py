import uuid
from django.db import models
from django.contrib import admin
from personnel.models import Personnel


class RoleStock(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    CHEF_DEPARTEMENT = "chef_departement", "Chef de département"
    RESPONSABLE_STOCK = "responsable_stock", "Responsable stock"
    CHEF_SERVICE = "chef_service", "Chef de service"


def default_stock_settings():
    return {
        "seuil_defaut": 5,
        "prefixes": {"ART": "ART", "ENT": "ENT", "SOR": "SOR", "RET": "RET", "DOT": "DOT", "INV": "INV"},
        "devise": "MGA", "format_rapport": "pdf", "duree_session_minutes": 60,
        "longueur_mot_de_passe": 8,
    }


class StockConfiguration(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    valeurs = models.JSONField(default=default_stock_settings)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = "stock_configuration"


class StockProfil(models.Model):
    """Rôle applicatif du module Stock, attaché à une fiche Personnel existante."""
    pst_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pst_personnel = models.OneToOneField(
        Personnel, on_delete=models.CASCADE,
        verbose_name="Personnel", related_name="stock_profil"
    )
    pst_role = models.CharField("Rôle Stock", max_length=30, choices=RoleStock.choices)
    pst_actif = models.BooleanField("Actif", default=True)
    pst_created_at = models.DateTimeField("Date création", auto_now_add=True)
    pst_updated_at = models.DateTimeField("Date modification", auto_now=True)

    def __str__(self):
        return f"{self.pst_personnel} — {self.get_pst_role_display()}"

    class Meta:
        db_table = 'stock_profil'
        verbose_name = "Profil Stock"


@admin.register(StockProfil)
class StockProfilAdmin(admin.ModelAdmin):
    list_display = ("pst_personnel", "pst_role", "pst_actif")
    list_filter = ("pst_role", "pst_actif")
    search_fields = ("pst_personnel__per_nom", "pst_personnel__per_matricule")
    autocomplete_fields = ("pst_personnel",)
