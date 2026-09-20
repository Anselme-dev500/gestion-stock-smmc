import uuid
from datetime import date
from django.db import models
from django.contrib import admin
from django.contrib.auth.models import User
from personnel.models import Personnel
from rh_departement.models import RhDepartement
from rh_direction.models import RhDirection
from rh_service.models import RhService
from simple_history.models import HistoricalRecords


class NiveauFonction(models.TextChoices):
    EMPLOYE = "N0", "Employé"
    CHEF_SERVICE = "N1", "Chef de service"
    CHEF_DEPARTEMENT = "N2", "Chef de département"
    DIRECTEUR = "N3", "Directeur"
    DIRECTION_GENERALE = "N4", "Direction générale"

def build_niveau_fonction_options(selected=None):
    """
    Génère les <option> HTML pour NiveauFonction
    :param selected: valeur sélectionnée (ex: "N1") ou None
    :return: string HTML
    """
    options = ['']

    for value, label in NiveauFonction.choices:
        is_selected = ' selected' if selected == value else ''
        options.append(f'<option value="{value}"{is_selected}>{label}</option>')

    return "\n".join(options)

class RoleFonction(models.TextChoices):
    STANDARD = "standard", "Standard"
    DRH = "drh", "Directeur RH"
    DG = "dg", "Direction générale"

def build_role_fonction_options(selected=None):
    """
    Génère les <option> HTML pour RoleFonction
    :param selected: valeur sélectionnée (ex: "drh") ou None
    :return: string HTML
    """
    options = ['']

    for value, label in RoleFonction.choices:
        is_selected = ' selected' if selected == value else ''
        options.append(f'<option value="{value}"{is_selected}>{label}</option>')

    return "\n".join(options)

class RhFonction(models.Model):
    """ Fonction - Poste occupé du personnel """
    fn_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fn_nom = models.CharField("Nom", max_length=100, unique=True, db_index=True)
    fn_nom_court = models.CharField("Nom court", max_length=20, null=True, blank=True)
    fn_actif = models.BooleanField("Actif", default=True)
    fn_role = models.CharField( "Rôle spécifique", max_length=10, choices=RoleFonction.choices, default=RoleFonction.STANDARD, db_index=True )
    fn_niveau = models.CharField("Niveau hiérarchique", max_length=50, choices=NiveauFonction.choices, default=NiveauFonction.EMPLOYE)
    fn_parent = models.ForeignKey(
        "self",
        verbose_name="Fonction supérieure",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="fn_subordonnes",
        db_index=True
    )
    fn_description = models.CharField("Description", max_length=150, blank=True, null=True)
    fn_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    fn_updated_at = models.DateTimeField("Date modification", auto_now=True)
    fn_created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Créé par"
    )

    fn_updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Modifié par"
    )

    history = HistoricalRecords()

    def __str__(self):
        return f'{self.fn_nom}'

    class Meta:
        db_table = 'rh_fonction'
        ordering = ("fn_nom", "fn_actif")
        indexes = [
            models.Index(fields=["fn_niveau"]),
            models.Index(fields=["fn_actif"]),
        ]


@admin.register(RhFonction)
class RhFonctionAdmin(admin.ModelAdmin):

    list_display = (
        "fn_nom",
        "fn_nom_court",
        "fn_niveau",
        "fn_role",
        "fn_parent",
        "fn_actif",
    )

    list_filter = (
        "fn_actif",
        "fn_niveau",
        "fn_role",
    )

    search_fields = (
        "fn_nom",
        "fn_nom_court",
    )

    autocomplete_fields = ("fn_parent",)

    readonly_fields = (
        "fn_created_at",
        "fn_updated_at",
        "fn_created_by",
        "fn_updated_by",
    )

    ordering = ("fn_nom",)

    fieldsets = (

        # Identification
        ("📌 Identification", {
            "fields": (
                "fn_nom",
                "fn_nom_court",
                "fn_actif",
            )
        }),

        # Organisation & hiérarchie
        ("🏢 Organisation", {
            "fields": (
                "fn_niveau",
                "fn_role",
                "fn_parent",
            ),
            "description": "Définit la position hiérarchique et les responsabilités."
        }),

        # Informations complémentaires
        ("📝 Informations complémentaires", {
            "fields": (
                "fn_description",
            ),
            "classes": ("collapse",)
        }),

        # Audit (lecture seule)
        ("🕓 Traçabilité", {
            "fields": (
                "fn_created_at",
                "fn_created_by",
                "fn_updated_at",
                "fn_updated_by",
            ),
            "classes": ("collapse",)
        }),
    )

    # Auto-remplissage audit
    def save_model(self, request, obj, form, change):
        if not obj.fn_created_by:
            obj.fn_created_by = request.user
        obj.fn_updated_by = request.user
        super().save_model(request, obj, form, change)


class TypeRattachement(models.TextChoices):
    HIERARCHIQUE = "HIERARCHIQUE", "Hiérarchique"
    FONCTIONNEL = "FONCTIONNEL", "Fonctionnel"
    INTERIM = "INTERIM", "Intérim"

def build_type_rattachement_options(selected=None):
    """
    Génère les <option> HTML pour TypeRattachement
    :param selected: valeur sélectionnée (ex: "HIERARCHIQUE") ou None
    :return: string HTML
    """
    options = ['']

    for value, label in TypeRattachement.choices:
        is_selected = ' selected' if selected == value else ''
        options.append(f'<option value="{value}"{is_selected}>{label}</option>')

    return "\n".join(options)


class RhRattachement(models.Model):
    """Rattachement hiérarchique du personnel (historisé et justifié)"""

    rh_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Personnel concerné (subordonné)
    rh_personnel = models.ForeignKey(
        Personnel,
        on_delete=models.PROTECT,
        related_name='rattachements',
        verbose_name="Personnel"
    )

    # Responsable hiérarchique
    rh_responsable = models.ForeignKey(
        Personnel,
        on_delete=models.PROTECT,
        related_name='subordonnes',
        verbose_name="Responsable hiérarchique"
    )

    # Fonction au moment du rattachement
    rh_fonction = models.ForeignKey(
        RhFonction,
        on_delete=models.PROTECT,
        verbose_name="Fonction occupée"
    )

    # Structure organisationnelle (snapshot)
    rh_direction = models.ForeignKey(
        RhDirection,
        on_delete=models.PROTECT,
        verbose_name="Direction",
        null=True,
        blank=True
    )

    rh_departement = models.ForeignKey(
        RhDepartement,
        on_delete=models.PROTECT,
        verbose_name="Département",
        null=True,
        blank=True
    )

    rh_service = models.ForeignKey(
        RhService,
        on_delete=models.PROTECT,
        verbose_name="Service",
        null=True,
        blank=True
    )

    # Type de relation
    rh_type = models.CharField(
        "Type de rattachement",
        max_length=30,
        choices=TypeRattachement,
        default=TypeRattachement.HIERARCHIQUE,
        db_index=True
    )

    # Dates (historisation)
    rh_date_debut = models.DateField(
        "Date début / Date effective du rattachement",
        default=date.today,
    )
    rh_date_fin = models.DateField("Date fin", null=True, blank=True)

    # Justification administrative
    rh_reference_acte = models.CharField(
        "Référence acte",
        max_length=100,
        blank=True,
        default="",
    )
    rh_date_acte = models.DateField("Date acte", null=True, blank=True)
    rh_piece = models.FileField( "Pièce justificative", upload_to='rh/rattachements/', null=True, blank=True )
    rh_note = models.TextField( "Note", null=True, blank=True )

    # Statut
    rh_actif = models.BooleanField("Actif", default=True, db_index=True)

    # Audit
    rh_created_at = models.DateTimeField("Date création", auto_now_add=True)
    rh_created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='+',
        verbose_name="Créé par"
    )

    rh_updated_at = models.DateTimeField("Date modification", auto_now=True)

    def __str__(self):
        return f"{self.rh_personnel} → {self.rh_responsable}"

    class Meta:
        db_table = "rh_rattachement"
        ordering = ("-rh_date_debut",)
        indexes = [
            models.Index(fields=["rh_personnel", "rh_actif"]),
            models.Index(fields=["rh_responsable", "rh_actif"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["rh_personnel", "rh_responsable"],
                condition=models.Q(rh_actif=True),
                name="unique_rattachement_actif_personnel_responsable",
            ),
        ]


@admin.register(RhRattachement)
class RhRattachementAdmin(admin.ModelAdmin):

    # Affichage liste
    list_display = (
        "rh_personnel",
        "rh_responsable",
        "rh_fonction",
        "rh_direction",
        "rh_type",
        "rh_date_debut",
        "rh_date_fin",
        "rh_actif",
    )

    # Filtres
    list_filter = (
        "rh_actif",
        "rh_type",
        "rh_direction",
        "rh_departement",
        "rh_service",
        "rh_fonction",
    )

    # Recherche
    search_fields = (
        "rh_personnel__per_nom",
        "rh_personnel__per_prenom",
        "rh_personnel__per_matricule",
        "rh_responsable__per_nom",
        "rh_responsable__per_prenom",
        "rh_reference_acte",
    )

    # Autocomplete (important pour performance)
    autocomplete_fields = (
        "rh_personnel",
        "rh_responsable",
        "rh_fonction",
        "rh_direction",
        "rh_departement",
        "rh_service",
    )

    # Champs readonly
    readonly_fields = (
        "rh_created_at",
        "rh_created_by",
        "rh_updated_at",
    )

    # Tri
    ordering = ("-rh_date_debut",)

    # Fieldsets structurés (UX admin propre)
    fieldsets = (

        # Identification
        ("📌 Rattachement", {
            "fields": (
                "rh_personnel",
                "rh_responsable",
                "rh_type",
                "rh_actif",
            )
        }),

        # Fonction & organisation
        ("🏢 Organisation", {
            "fields": (
                "rh_fonction",
                "rh_direction",
                "rh_departement",
                "rh_service",
            ),
            "description": "Photographie de la structure organisationnelle au moment du rattachement."
        }),

        # Période
        ("📅 Période de validité", {
            "fields": (
                "rh_date_debut",
                "rh_date_fin",
            )
        }),

        # Justification administrative
        ("📜 Justification", {
            "fields": (
                "rh_reference_acte",
                "rh_date_acte",
                "rh_piece",
                "rh_note",
            )
        }),

        # Audit
        ("🕓 Traçabilité", {
            "fields": (
                "rh_created_at",
                "rh_created_by",
                "rh_updated_at",
            ),
            "classes": ("collapse",)
        }),
    )

    # Optimisation queryset (important si gros volume)
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "rh_personnel",
            "rh_responsable",
            "rh_fonction",
            "rh_direction",
            "rh_departement",
            "rh_service",
        )

    # Auto-remplissage audit
    def save_model(self, request, obj, form, change):
        if not obj.rh_created_by:
            obj.rh_created_by = request.user
        super().save_model(request, obj, form, change)
