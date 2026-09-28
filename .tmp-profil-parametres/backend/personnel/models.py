import re
import uuid
import json
import logging
import unicodedata
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.db import models
from django.contrib import admin
# from django.utils.html import mark_safe
from django.utils.safestring import mark_safe
from django.utils.html import format_html

from cdg_centre_responsabilite.models import CentreResponsabilite
from pointage.models import ShiftPointage
from simple_history.models import HistoricalRecords


logger = logging.getLogger(__name__)


TP_PERS = "PERSONNEL"
TP_EXTERNE = "EXTERNE"
TP_TEMP = "TEMPORAIRE"

TYPE_PERSONNEL = [
    (TP_PERS, "Personnel"),
    (TP_EXTERNE, "Externe"),
    (TP_TEMP, "Temporaire"),
]

SITE_TOAMASINA = "TOAMASINA"
SITE_VOHEMAR = "VOHEMAR"

SITE_AFFECTATION = [
    (SITE_TOAMASINA, "Toamasina"),
    (SITE_VOHEMAR, "Vohemar")
]

SX_NON_DEFINI = "NON_DEFINI"
SX_HOMME = "HOMME"
SX_FEMME = "FEMME"

SEXE_PERSONNEL = [
    (SX_NON_DEFINI, "Non défini"),
    (SX_HOMME, "Homme"),
    (SX_FEMME, "Femme"),
]

TC_CDI = "CDI"
TC_CDD = "CDD"
TC_LOUAGE = "LOUAGE"
TC_STAGE = "STAGE"

TYPE_CONTRAT = [
    (TC_CDI, "CDI"),
    (TC_CDD, "CDD"),
    (TC_LOUAGE, "CONTRAT DE LOUAGE"),
    (TC_STAGE, "STAGE")
]


PER_ACTIF = "ACTIF"
PER_PE = "PERIODE_ESSAIE"
PR_STAGIAIRE = "STAGIAIRE"
PR_SUSPENDU = "SUSPENDU"
PR_MISSION = "MISSION"
PR_DETACHE = "DETACHE"
PR_DEMISSIONNAIRE = "DEMISSIONNAIRE"
PR_LICENCIE = "LICENCIE"
PR_RETRAITE = "RETRAITE"
PR_DECEDE = "DECEDE"

STATUT_PERSONNEL = [
    (PER_ACTIF, "Actif"),
    (PER_PE, "En période d'essai"),
    (PR_STAGIAIRE, "Stagiaire"),
    (PR_SUSPENDU, "Suspendu"),
    (PR_MISSION, "En mission"),
    (PR_DETACHE, "Détaché"),
    (PR_DEMISSIONNAIRE, "Démissionnaire"),
    (PR_LICENCIE, "Licencié"),
    (PR_RETRAITE, "Retraité"),
    (PR_DECEDE, "Décédé"),
]


GS_NON_DEFINI = "NON_DEFINI"
GS_A_plus = "A_plus"
GS_A_moins = "A_moins"
GS_B_plus = "B_plus"
GS_B_moins = "B_moins"
GS_AB_plus = "AB_plus"
GS_AB_moins = "AB_moins"
GS_0_plus = "0_plus"
GS_0_moins = "0_moins"

GROUPE_SANGUIN = [
    (GS_NON_DEFINI, "--"),
    (GS_A_plus, "A+"),
    (GS_A_moins, "A-"),
    (GS_B_plus, "B+"),
    (GS_B_moins, "B-"),
    (GS_AB_plus, "AB+"),
    (GS_AB_moins, "AB-"),
    (GS_0_plus, "0+"),
    (GS_0_moins, "O-")
]

TT_PLEIN = "PLEIN"
TT_PARTIEL = "PARTIEL"
TT_PRESTATAIRE = "PRESTATAIRE"
TT_STAGIAIRE = "STAGIAIRE"

TEMPS_TRAVAIL = [
    (TT_PLEIN, "Temps plein"),
    (TT_PARTIEL, "Temps partiel"),
    (TT_PRESTATAIRE, "Prestataire"),
    (TT_STAGIAIRE, "Stagiaire")
]

T_S = "SMALL"
T_M = "MEDIUM"
T_L = "LARGE"
T_XL = "EXTRA_LARGE"
T_XXL = "DOUBLE_EXTRA_LARGE"
T_XXXL = "TRIPLE_EXTRA_LARGE"

TAILLE_VETEMENT = [
    (T_S, "S"),
    (T_M, "M"),
    (T_L, "L"),
    (T_XL, "XL"),
    (T_XXL, "XXL"),
    (T_XXXL, "XXXL")
]


def sexe_PERSONNEL(choix = None):
    tab = ''
    for key, value in SEXE_PERSONNEL:
        if key != SX_NON_DEFINI:
            txtChoix = 'selected' if choix and choix == key else ''
            tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab

def site_PERSONNEL(choix = None):
    tab = ''
    for key, value in SITE_AFFECTATION:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab

def statut_PERSONNEL(choix = None):
    tab = ''
    for key, value in STATUT_PERSONNEL:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab

def taille_VETEMENT(choix = None):
    tab = ''
    for key, value in TAILLE_VETEMENT:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab

def sexe_PERSONNEL_V2():
    tab = ''
    for key, value in SEXE_PERSONNEL:
        tab = tab + str('<option value="{}">{}</option>'.format(key, value))

    return tab


def typecontrat_PERSONNEL(choix = None):
    tab = ''
    for key, value in TYPE_CONTRAT:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab


def groupesanguin_PERSONNEL(choix = None):
    tab = ''
    for key, value in GROUPE_SANGUIN:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab


def tempstravail_PERSONNEL(choix = None):
    tab = ''
    for key, value in TEMPS_TRAVAIL:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab


class PersonnelParametrage(models.Model):
    """ Paramétrage personnel """
    pper_id = models.SmallAutoField(primary_key=True)
    pper_synchro_ivms = models.BooleanField("Synchroniser pointeuse", default=False)
    prh_updated_at = models.DateTimeField("Date modification", auto_now=True)
    prh_updated_by = models.IntegerField("Modificateur", default=1)

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(pper_id=1)
        return instance

    class Meta:
        db_table = 'personnel_parametrage'
        verbose_name = "Paramétrage personnel"


@admin.register(PersonnelParametrage)
class PersonnelParametrageAdmin(admin.ModelAdmin):
    list_display = ("pper_synchro_ivms", "prh_updated_at")


def personnel_directory_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}.{ext}"
    return f"personnel/{instance.per_ref_dossier}/{filename}"


class Personnel(models.Model):
    """ Personnel """
    per_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    per_matricule = models.CharField("Matricule", max_length=30, unique=True, db_index=True)
    per_nom = models.CharField("Nom", max_length=100, db_index=True)
    per_prenom = models.CharField("Prénom", max_length=100, null=True, blank=True)
    per_sexe = models.CharField("Sexe", max_length=15, choices=SEXE_PERSONNEL, default=SX_NON_DEFINI)
    per_groupe_sanguin = models.CharField("Groupe sanguin", null=True, blank=True,
                                          max_length=15,
                                          choices=GROUPE_SANGUIN,
                                          default=GS_NON_DEFINI)
    per_type_compte = models.CharField("Type compte", null=True, blank=True,
                                          max_length=30,
                                          choices=TYPE_PERSONNEL,
                                          default=TP_PERS)
    per_site = models.CharField("Site d'affectation",
                                          max_length=70,
                                          choices=SITE_AFFECTATION,
                                          default=SITE_TOAMASINA)
    per_statut = models.CharField("Statut", max_length=30, choices=STATUT_PERSONNEL, default=PER_ACTIF)
    per_statut_note = models.TextField("Note sur le statut", null=True, blank=True)
    per_temps_travail = models.CharField("Nature de contrat", max_length=30, choices=TEMPS_TRAVAIL, default=TT_PLEIN)
    per_date_naissance = models.DateField("Date de naissance")
    per_lieu_naissance = models.CharField("Lieu de naissance", max_length=100, null=True, blank=True)
    per_nom_pere = models.CharField("Nom du père", max_length=150, null=True, blank=True)
    per_nom_mere = models.CharField("Nom de la mère", max_length=150, null=True, blank=True)
    per_personne_contacter = models.CharField("Personne à contacter", max_length=150, null=True, blank=True)
    per_personne_contacter_phone = models.CharField("N° téléphone personne à contacter", max_length=20, null=True, blank=True)
    per_numero_cin = models.CharField("N° CIN", max_length=20, unique=True, db_index=True)
    per_date_delivrance_cin = models.DateField("Date délivrance CIN", null=True, blank=True)
    per_lieu_delivrance_cin = models.CharField("Lieu délivrance CIN", max_length=100, null=True, blank=True)
    per_duplicata_cin = models.CharField("Duplicata CIN", max_length=100, null=True, blank=True)
    per_num_cnaps = models.CharField("N° CNaPS", max_length=60, null=True, blank=True)
    per_photo = models.ImageField("Photo identité", upload_to=personnel_directory_path, null=True, blank=True)
    per_signature = models.ImageField("Signature", upload_to=personnel_directory_path, null=True, blank=True)
    per_adresse_personnelle = models.CharField("Adresse personnelle", max_length=100, null=True, blank=True)
    per_adresse_complementaire = models.CharField("Adresse complementaire", max_length=100, null=True, blank=True)
    per_telephone_perso = models.CharField("N° téléphone perso", max_length=20, null=True, blank=True)
    per_telephone_pro = models.CharField("N° téléphone pro", max_length=20, null=True, blank=True)
    per_email_perso = models.CharField("Email perso", max_length=150, null=True, blank=True)
    per_email_pro = models.CharField("Email pro", max_length=150, null=True, blank=True)
    per_date_embauche = models.DateField("Date d'embauche")
    per_lieu_embauche = models.CharField("Lieu embauche", max_length=150, blank=True, null=True)
    per_poids = models.DecimalField("Poids kg", max_digits=5, decimal_places=2, null=True, blank=True, help_text="Poids en kilogrammes")
    per_taille = models.DecimalField("Taille", max_digits=5, decimal_places=2, null=True, blank=True, help_text="Taille en mètres")
    per_pointure = models.DecimalField("Pointure chaussure", max_digits=5, decimal_places=1, null=True, blank=True, help_text="Pointure de chaussure (ex: 42.5)")
    per_taille_vetement = models.CharField("Taille vêtement", null=True, blank=True,
                                          max_length=30,
                                          choices=TAILLE_VETEMENT,
                                          default=T_L)
    per_echelon = models.CharField("Echelon", max_length=20, null=True, blank=True)
    per_date_debauche = models.DateField("Date débauche", null=True, blank=True)
    per_motif_debauche = models.TextField("Motif débauche", blank=True, null=True)
    per_type_contrat = models.CharField("Type contrat", max_length=20, choices=TYPE_CONTRAT)
    per_ref_dossier = models.UUIDField("Réf. dossier", default=uuid.uuid4, editable=False, unique=True)
    per_allergie = models.TextField("Allergie", blank=True, null=True)
    per_shift_travail = models.ForeignKey(ShiftPointage,
                                          on_delete=models.SET_NULL,
                                          null=True,
                                          blank=True,
                                          verbose_name="Shift de travail",
                                          related_name="personnel_shift_travail")
    per_situ_matrimoniale = models.ForeignKey('rh.RhSituationMatrimoniale',
                                          on_delete=models.SET_NULL,
                                          null=True,
                                          blank=True,
                                          verbose_name="Situation matrimoniale",
                                          related_name="personnel_situ_matrimoniale")
    per_classification = models.ForeignKey('rh.RhClassification',
                                          on_delete=models.SET_NULL,
                                          null=True,
                                          blank=True,
                                          verbose_name="Classification",
                                          related_name="personnel_classification")
    per_etablissement = models.ForeignKey('rh_etablissement.RhEtablissement',
                                          on_delete=models.SET_NULL,
                                          null=True,
                                          blank=True,
                                          verbose_name="Etablissement",
                                          related_name="personnel_etablissement")
    per_centre_responsabilite = models.ForeignKey(CentreResponsabilite,
                                          on_delete=models.SET_NULL,
                                          null=True,
                                          blank=True,
                                          verbose_name="Centre responsabilité",
                                          related_name="personnel_centre_responsabilite")
    per_fonction = models.ForeignKey('rh_fonction.RhFonction',
                                     on_delete=models.CASCADE,
                                     verbose_name="Fonction",
                                     related_name="personnel_fonction")
    per_direction = models.ForeignKey('rh_direction.RhDirection',
                                      on_delete=models.SET_NULL,
                                      null=True,
                                      blank=True,
                                      verbose_name="Direction",
                                      related_name="personnel_direction")
    per_departement = models.ForeignKey('rh_departement.RhDepartement',
                                        on_delete=models.SET_NULL,
                                        null=True,
                                        blank=True,
                                        verbose_name="Département",
                                        related_name="personnel_departement")
    per_service = models.ForeignKey('rh_service.RhService',
                                    on_delete=models.SET_NULL,
                                    null=True,
                                    blank=True,
                                    verbose_name="Service",
                                    related_name="personnel_service")
    per_actif = models.BooleanField("Actif", default=True)
    per_user_admin = models.BooleanField("Admin Nexus", default=False)
    per_metadata = models.JSONField("Metadata", blank=True, null=True, editable=False)
    per_description = models.CharField("Description", max_length=200, blank=True, null=True)
    per_note = models.TextField("Note", blank=True, null=True)
    per_user = models.OneToOneField(User,
                                    on_delete=models.CASCADE,
                                    verbose_name='User ID',
                                    related_name="user_personnel",
                                    null=True, blank=True)  # Car un utilisateur ne peut forcément être un personnel
    per_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    per_created_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Créateur",
                                       related_name="createur_personnel")
    per_updated_at = models.DateTimeField("Date modification", auto_now=True)
    per_updated_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Modificateur",
                                       related_name="modificateur_personnel")
    
    history = HistoricalRecords()

    @staticmethod
    def get_personnel_id_by_user(user):
        if not user:
            return None

        return Personnel.objects.filter(per_user=user).values_list("per_id", flat=True).first()

    def __str__(self):
        return f"{self.per_matricule} - {self.per_nom} {self.per_prenom or ''}".strip()
    
    def photo_preview(self):
        if self.per_photo:
            return f'<img src="{self.per_photo.url}" width="30" height="30" style="border-radius: 6px; object-fit: cover;" />'
        return "(Aucune photo)"
    
    @classmethod
    def get_by_matricule(cls, matricule: str, active_only: bool = True, exclude_admin: bool = True):
        """
        Retourne l'instance Personnel correspondant au matricule ou None.
        - matricule : valeur du matricule (str)
        - active_only : si True filtre sur per_actif=True
        - exclude_admin : si True filtre sur per_user_admin=False
        Utilise .get() (per_matricule est unique) et gère l'exception si introuvable.
        """
        if not matricule:
            return None

        filters = {'per_matricule': matricule}
        if active_only:
            filters['per_actif'] = True
        if exclude_admin:
            filters['per_user_admin'] = False

        try:
            return cls.objects.get(**filters)
        except cls.DoesNotExist:
            return None


    @staticmethod
    def get_centre_responsabilite(user):
        """
        Retourne le cr_code du centre responsabilité lié à un user.
        Si aucun personnel ou centre trouvé → retourne None.
        """
        if not user:
            return None

        try:
            personnel = Personnel.objects.select_related("per_centre_responsabilite").get(per_user=user)
        except Personnel.DoesNotExist:
            return None

        # Vérification si un centre est lié
        if personnel.per_centre_responsabilite:
            return personnel.per_centre_responsabilite.cr_code

        return None


    @staticmethod
    def build_metadata(obj):
        """
        Construit un dictionnaire JSON contenant les informations administratives
        à partir d'un User ou d'un Personnel.

        - Si obj = User → récupère le personnel lié
        - Si obj = Personnel → utilisé directement
        """

        personnel = None

        # ========================
        # CAS 1 : USER
        # ========================
        if isinstance(obj, User):
            try:
                personnel = obj.user_personnel
            except Personnel.DoesNotExist:
                return None

        # ========================
        # CAS 2 : PERSONNEL
        # ========================
        elif isinstance(obj, Personnel):
            # Vérifie qu'il existe bien en base
            personnel = Personnel.objects.filter(pk=obj.pk).first()
            if not personnel:
                return None

        # ========================
        # CAS INVALIDE
        # ========================
        else:
            return None

        # ========================
        # VARIABLES
        # ========================
        direction = personnel.per_direction
        fonction = personnel.per_fonction
        etab = personnel.per_etablissement
        departement = personnel.per_departement
        service = personnel.per_service
        centre_responsabilite = personnel.per_centre_responsabilite
        classification = personnel.per_classification
        temps_presence = personnel.per_shift_travail

        # ========================
        # BUILD JSON
        # ========================
        return {
            "personnel": {
                "id": str(personnel.per_id),
                "nom_prenom": f'{personnel.per_nom} {personnel.per_prenom}',
                "matricule": personnel.per_matricule,
                "user_id": str(personnel.per_user.id) if personnel.per_user else None,
                "user_username": str(personnel.per_user.username) if personnel.per_user else None,
            },
            "direction": {
                "id": str(direction.dir_id) if direction else None,
                "nom": direction.dir_nom if direction else None,
                "nom_court": direction.dir_nom_court if direction else None,
            },
            "fonction": {
                "id": str(fonction.fn_id) if fonction else None,
                "nom": fonction.fn_nom if fonction else None,
                "nom_court": fonction.fn_nom_court if fonction else None,
                "niveau": fonction.fn_niveau if fonction else None,
            },
            "etablissement": {
                "id": str(etab.etab_id) if etab else None,
                "code": etab.etab_code if etab else None,
                "nom": etab.etab_nom if etab else None,
            },
            "departement": {
                "id": str(departement.dep_id) if departement else None,
                "code": departement.dep_nom_court if departement else None,
                "nom": departement.dep_nom if departement else None,
            },
            "service": {
                "id": str(service.ser_id) if service else None,
                "code": service.ser_nom_court if service else None,
                "nom": service.ser_nom if service else None,
            },
            "centre_responsabilite": {
                "id": str(centre_responsabilite.cr_id) if centre_responsabilite else None,
                "code": centre_responsabilite.cr_code if centre_responsabilite else None,
                "nom": centre_responsabilite.cr_nom if centre_responsabilite else None,
                "id_direction": str(centre_responsabilite.cr_direction.crdir_id) if centre_responsabilite and centre_responsabilite.cr_direction else None,
                "code_direction": centre_responsabilite.cr_direction.crdir_code if centre_responsabilite and centre_responsabilite.cr_direction else None,
                "nom_direction": centre_responsabilite.cr_direction.crdir_nom if centre_responsabilite and centre_responsabilite.cr_direction else None,
            },
            "classification": {
                "classification_id": str(classification.cla_id) if classification else None,
                "classification_nom": classification.cla_nom if classification else None,
            },
            "temps_presence": {
                "temps_presence_id": str(temps_presence.shpt_id) if temps_presence else None,
                "temps_presence_nom": temps_presence.shpt_nom if temps_presence else None,
            },
            "autres_infos": {
                "datetime": timezone.now().isoformat(),
                "site_affectation": str(personnel.per_site),
                "type_contrat": str(personnel.per_type_contrat),
                "echelon": str(personnel.per_echelon),
                "email_pro": personnel.per_email_pro,
                "email_perso": personnel.per_email_perso,
                "telephone_pro": personnel.per_telephone_pro,
                "telephone_perso": personnel.per_telephone_perso,
                "adresse_perso": personnel.per_adresse_personnelle,
                "adresse_complementaire": personnel.per_adresse_complementaire,
            },
        }

    class Meta:
        db_table = 'personnel'
        verbose_name = "Personnel"
        ordering = ("per_matricule", "per_nom", "per_matricule")


@admin.register(Personnel)
class PersonnelAdmin(admin.ModelAdmin):

    list_display = (
        "per_matricule",
        "per_nom",
        "per_prenom",
        "per_fonction",
        "per_service",
        "per_statut",
        "has_user_account",
        "per_actif",
        "photo_display",
    )

    autocomplete_fields = ("per_fonction", "per_departement", "per_service", "per_centre_responsabilite", "per_etablissement", "per_user",)
    
    search_fields = (
        "per_matricule",
        "per_nom",
        "per_prenom",
        "per_numero_cin",
        "per_email_pro",
    )

    list_filter = (
        "per_site",
        "per_sexe",
        "per_statut",
        "per_actif",
        "per_type_contrat",
    )

    list_per_page = 25
    ordering = ("per_matricule", "per_nom", "per_prenom")

    readonly_fields = (
        "per_created_at",
        "per_updated_at",
        "per_created_by",
        "per_updated_by",
        "metadata_viewer",
        "photo_display",
    )

    fieldsets = (

        ("🧍 Informations personnelles", {
            "fields": (
                ("per_nom", "per_prenom", "per_matricule"),
                ("per_date_naissance", "per_lieu_naissance", "per_sexe"),
                ("per_situ_matrimoniale", "per_groupe_sanguin"),
                ("per_nom_pere", "per_nom_mere"),
                "per_allergie",
            )
        }),

        ("📄 Pièces d'identité", {
            "fields": (
                ("per_numero_cin", "per_date_delivrance_cin", "per_lieu_delivrance_cin"),
                ("per_duplicata_cin", "per_num_cnaps"),
            )
        }),

        ("🏢 Informations professionnelles", {
            "fields": (
                ("per_site", "per_etablissement", "per_classification"),
                ("per_direction", "per_departement", "per_service"),
                ("per_fonction", "per_echelon"),
                ("per_centre_responsabilite",),
                ("per_type_contrat", "per_temps_travail", "per_shift_travail"),
                ("per_date_embauche", "per_lieu_embauche"),
                ("per_date_debauche", "per_motif_debauche"),
            )
        }),

        ("📞 Coordonnées", {
            "fields": (
                ("per_telephone_pro", "per_telephone_perso"),
                ("per_email_pro", "per_email_perso"),
                ("per_adresse_personnelle", "per_adresse_complementaire"),
                ("per_personne_contacter", "per_personne_contacter_phone"),
            )
        }),

        ("📸 Fichiers et infos physiques", {
            "fields": (
                ("photo_display", "per_photo", "per_signature"),
                ("per_poids", "per_taille", "per_pointure", "per_taille_vetement"),
            )
        }),

        ("⚙️ Statut et paramètres", {
            "fields": (
                ("per_user", "per_statut", "per_statut_note"),
                ("per_actif", "per_user_admin"),
                "per_description",
                "per_note",
            )
        }),

        ("🧠 Métadonnées système", {
            "classes": ("collapse",),  # 👉 collapsé par défaut
            "fields": (
                "metadata_viewer",
            )
        }),

        ("🕓 Suivi et traçabilité", {
            "classes": ("collapse",),
            "fields": (
                "per_created_by",
                "per_created_at",
                "per_updated_by",
                "per_updated_at",
            )
        }),
    )

    # ========================
    # METADATA VIEWER
    # ========================
    def metadata_viewer(self, obj):
        if not obj or not obj.per_metadata:
            return "(Aucune metadata)"

        try:
            formatted_json = json.dumps(obj.per_metadata, indent=4, ensure_ascii=False)
        except Exception:
            formatted_json = str(obj.per_metadata)

        return format_html(
            """
            <div style="
                background:#0f172a;
                color:#e2e8f0;
                padding:12px;
                border-radius:8px;
                max-height:400px;
                overflow:auto;
                font-size:12px;
                font-family: monospace;
                white-space: pre-wrap;
            ">
            {}
            </div>
            """,
            formatted_json
        )

    metadata_viewer.short_description = "JSON Metadata"

    # ========================
    # PHOTO DISPLAY
    # ========================
    def photo_display(self, obj):
        if obj.per_photo:
            return mark_safe(
                f'<img src="{obj.per_photo.url}" width="40" height="40" '
                f'style="border-radius:8px; object-fit:cover;" />'
            )
        return "(Aucune)"

    photo_display.short_description = "Photo"

    @admin.display(boolean=True, description="Compte utilisateur")
    def has_user_account(self, obj):
        return obj.per_user_id is not None

    # ========================
    # SAVE MODEL
    # ========================
    def save_model(self, request, obj, form, change):
        if not change:
            obj.per_created_by = request.user if request.user.is_authenticated else None

        if request.user.is_authenticated:
            obj.per_updated_by = request.user
            obj.per_updated_at = datetime.now()

        super().save_model(request, obj, form, change)


HIST_FONCTION = "fonction"
HIST_SERVICE = "service"
HIST_DEPARTEMENT = "departement"
HIST_DIRECTION = "direction"
HIST_SITE = "site"
HIST_CENTRE_RESPONSABILITE = "centre_responsabilite"
HIST_ETABLISSEMENT = "etablissement"
HIST_CLASSIFICATION = "classification"
HIST_ECHELON = "echelon"

TYPE_HISTORIQUE_CHOICES = [
    (HIST_FONCTION, "Changement de fonction"),
    (HIST_SERVICE, "Changement de service"),
    (HIST_DEPARTEMENT, "Changement de département"),
    (HIST_DIRECTION, "Changement de direction"),
    (HIST_SITE, "Changement de site d'affectation"),
    (HIST_CENTRE_RESPONSABILITE, "Changement du centre de responsabilité"),
    (HIST_ETABLISSEMENT, "Changement d'établissement"),
    (HIST_CLASSIFICATION, "Changement de classification"),
    (HIST_ECHELON, "Changement d'échelon"),
]

def type_HISTORIQUE(choix = None):
    tab = ''
    for key, value in TYPE_HISTORIQUE_CHOICES:
        txtChoix = 'selected' if choix and choix == key else ''
        tab += f'<option value="{key}" {txtChoix}>{value}</option>'

    return tab


def historique_directory_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}.{ext}"
    return f"historique-personnel/{instance.mothist_id}/{filename}"


class PersonnelHistoriqueMotif(models.Model):
    mothist_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mothist_date_effet = models.DateField("Date effet du mouvement", null=True, blank=True) 
    mothist_motif = models.CharField("Motif du mouvement", max_length=200)
    mothist_fichier = models.ImageField("Pièce motif", upload_to=historique_directory_path, null=True, blank=True)
    mothist_fichier2 = models.ImageField("Pièce motif 2", upload_to=historique_directory_path, null=True, blank=True)
    mothist_personnel = models.ForeignKey( "Personnel", on_delete=models.CASCADE, related_name="motif_historiques_personnel" )
    mothist_personnel_metadata = models.JSONField("Metadata", null=True, blank=True)
    mothist_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    mothist_created_by = models.ForeignKey(User,
                                           on_delete=models.CASCADE,
                                           editable=False,
                                           verbose_name="Créateur",
                                           related_name="createur_motif_hist_personnel")

    def __str__(self):
        return f'{self.mothist_date_effet}'

    class Meta:
        db_table = 'personnel_historique_motif'
        verbose_name = "Historique motif du mouvement de personnel"
        ordering = ["-mothist_created_at"]


@admin.register(PersonnelHistoriqueMotif)
class PersonnelHistoriqueMotifAdmin(admin.ModelAdmin):

    # Colonnes affichées dans la liste
    list_display = (
        "mothist_date_effet",
        "mothist_motif",
        "mothist_personnel",
        "mothist_created_by",
        "mothist_created_at",
    )

    # Recherche
    search_fields = (
        "mothist_motif",
        "mothist_personnel__per_nom",
        "mothist_personnel__per_prenom",
    )

    # Filtres à droite
    list_filter = (
        "mothist_created_at",
        "mothist_created_by",
    )

    # Ordre d'affichage
    ordering = ("-mothist_created_at",)

    # Champs en lecture seule
    readonly_fields = (
        "mothist_id",
        "mothist_created_at",
        "mothist_created_by",
    )

    # Organisation du formulaire admin
    fieldsets = (
        ("Information du motif", {
            "fields": (
                "mothist_personnel",
                "mothist_motif",
            )
        }),
        ("Pièces jointes", {
            "fields": (
                "mothist_fichier",
                "mothist_fichier2",
            )
        }),
        ("Informations techniques", {
            "fields": (
                "mothist_personnel_metadata",
                "mothist_created_at",
                "mothist_created_by",
            ),
            "classes": ("collapse",)
        }),
    )

    # Pour éviter les dropdown lourds si beaucoup de personnels
    autocomplete_fields = ("mothist_personnel",)

    # Remplir automatiquement le créateur
    def save_model(self, request, obj, form, change):
        if not obj.mothist_created_by:
            obj.mothist_created_by = request.user
        super().save_model(request, obj, form, change)


class PersonnelHistorique(models.Model):
    """Historique structuré des changements RH d'un personnel."""
    hisper_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    hisper_motif = models.ForeignKey( PersonnelHistoriqueMotif, 
                                         on_delete=models.SET_NULL,
                                         null=True,
                                         blank=True,
                                         related_name="motif_historique" )

    hisper_personnel = models.ForeignKey( "Personnel", on_delete=models.CASCADE, related_name="historiques_personnel" )
    hisper_type_historique = models.CharField( "Type d'historique", max_length=50, choices=TYPE_HISTORIQUE_CHOICES )

    # --- Anciennes & nouvelles valeurs (avant/après) ---
    hisper_ancienne_valeur = models.CharField("Ancienne valeur", max_length=200, null=True, blank=True)
    hisper_nouvelle_valeur = models.CharField("Nouvelle valeur", max_length=200, null=True, blank=True)

    # --- Dates ---
    hisper_date_debut = models.DateField("Date début")           # début de la nouvelle affectation
    hisper_date_fin = models.DateField("Date fin", null=True, blank=True)  # fin de l’ancienne

    # --- Informations complémentaires ---
    hisper_note = models.TextField("Informations complémentaires", null=True, blank=True)

    hisper_fichier_justificatif = models.FileField("Fichier justificatif", upload_to="rh/historique/", null=True, blank=True )

    # Données supplémentaires venant d’un ERP (Dynamics 365, SIGRH, etc.)
    hisper_personnel_metadata = models.JSONField("Metadata", null=True, blank=True)

    hisper_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    hisper_created_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Créateur",
                                       related_name="createur_hist_personnel")
    hisper_updated_at = models.DateTimeField("Date modification", auto_now=True)
    hisper_updated_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Modificateur",
                                       related_name="modificateur_hist_personnel")
    
    @staticmethod
    def cloturer_ancienne_affectation(personnel, type_historique, nouvelle_date_debut):
        """
        Ferme automatiquement la précédente ligne d'historique pour un type donné.
        """

        try:
            ancien = PersonnelHistorique.objects.filter(
                hisper_personnel=personnel,
                hisper_type_historique=type_historique,
                hisper_date_fin__isnull=True
            ).order_by("-hisper_date_debut").first()

            if ancien:
                ancien.hisper_date_fin = nouvelle_date_debut - timedelta(days=1)
                ancien.save()

            return ancien  # retourne l’objet modifié ou None

        except Exception as e:
            logger.error( f"[PersonnelHistorique] Erreur lors de la clôture de l'ancienne " f"affectation pour personnel={personnel.per_id}, type={type_historique} : {e}" )
            return None

    class Meta:
        db_table = 'personnel_historique'
        verbose_name = "Historique du personnel"
        verbose_name_plural = "Historiques du personnel"
        ordering = ["-hisper_date_debut"]

    history = HistoricalRecords()

    def __str__(self):
        return f"{self.get_hisper_type_historique_display()} - {self.hisper_personnel}"
    

@admin.register(PersonnelHistorique)
class PersonnelHistoriqueAdmin(admin.ModelAdmin):
    
    # Affichage des colonnes
    list_display = (
        "hisper_personnel",
        "hisper_type_historique",
        "hisper_ancienne_valeur",
        "hisper_nouvelle_valeur",
        "hisper_date_debut",
        "hisper_date_fin",
        "hisper_created_by",
        "hisper_updated_by",
    )

    # Recherche dans admin
    search_fields = (
        "hisper_personnel__per_nom",
        "hisper_personnel__per_prenom",
        "hisper_ancienne_valeur",
        "hisper_nouvelle_valeur",
    )

    # Filtres latéraux
    list_filter = (
        "hisper_type_historique",
        "hisper_date_debut",
        "hisper_date_fin",
        "hisper_created_by",
        "hisper_updated_by",
    )

    # Champs groupés dans les formulaires admin
    fieldsets = (
        ("Information du personnel", {
            "fields": ("hisper_personnel", "hisper_type_historique")
        }),

        ("Valeurs avant / après", {
            "fields": ("hisper_ancienne_valeur", "hisper_nouvelle_valeur")
        }),

        ("Période", {
            "fields": ("hisper_date_debut", "hisper_date_fin")
        }),

        ("Informations complémentaires", {
            "fields": ("hisper_note", "hisper_fichier_justificatif")
        }),

        ("Metadata ERP", {
            "classes": ("collapse",),
            "fields": ("hisper_personnel_metadata",)
        }),

        ("Audit", {
            "classes": ("collapse",),
            "fields": (
                "hisper_created_at", "hisper_created_by",
                "hisper_updated_at", "hisper_updated_by",
            )
        }),
    )

    # Champs en lecture seule
    readonly_fields = (
        "hisper_created_at",
        "hisper_updated_at",
        "hisper_created_by",
        "hisper_updated_by",
    )

    # Enregistrement automatique de l’audit
    def save_model(self, request, obj, form, change):
        if not change:
            obj.hisper_created_by = request.user
        obj.hisper_updated_by = request.user
        super().save_model(request, obj, form, change)

    # Sécurité : empêcher la modification du créateur original
    def get_readonly_fields(self, request, obj=None):
        ro = list(self.readonly_fields)
        if obj:
            ro.append("hisper_created_by")
        return ro
    


class PersonnelPermission(models.Model):
    ppers_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ppers_personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE,
                                           verbose_name="Personnel",
                                           related_name="permission_personnel")
    ppers_actif = models.BooleanField("Actif", default=True)
    ppers_is_tdb = models.BooleanField("Tableau de bord", default=False)
    ppers_is_creator = models.BooleanField("Création personnel", default=False)
    ppers_is_listing = models.BooleanField("Liste personnel", default=False)
    ppers_is_detail = models.BooleanField("Détail personnel", default=False)
    ppers_is_importer = models.BooleanField("Importer personnel", default=False)
    ppers_is_effectif = models.BooleanField("Effectif", default=False)
    ppers_is_repartition_generale = models.BooleanField("Répartition générale", default=False)
    ppers_is_dossier = models.BooleanField("Dossier personnel", default=False)
    ppers_is_sanction = models.BooleanField("Sanction personnel", default=False)
    ppers_is_enfant = models.BooleanField("Enfant personnel", default=False)
    ppers_is_absence_medicale = models.BooleanField("Absence médicale", default=False)
    ppers_is_mouvement = models.BooleanField("Mouvement personnel", default=False)
    ppers_is_accident_travail = models.BooleanField("Accident de travail", default=False)
    ppers_is_rattachement = models.BooleanField("Rattachement", default=False)
    ppers_is_rattachement_desactiver = models.BooleanField(
        "Désactiver un rattachement",
        default=False,
    )
    ppers_created_at = models.DateTimeField("Date création", auto_now_add=True, editable=False)
    ppers_created_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Créateur",
                                       related_name="createur_permission_personnel")
    ppers_updated_at = models.DateTimeField("Date modification", auto_now=True)
    ppers_updated_by = models.ForeignKey(User,
                                       on_delete=models.CASCADE,
                                       editable=False,
                                       verbose_name="Modificateur",
                                       related_name="modificateur_permission_personnel")
    
    def __str__(self):
        return f'{self.ppers_personnel} - {self.ppers_created_at}'
    
    @staticmethod
    def has_permission(user, perm_name: str, actif=True) -> bool:
        """
        Vérifie si un utilisateur dispose d'une permission donnée.
        Exemple :
            PersonnelPermission.has_permission(request.user, "ppers_is_creator")
        Retourne True ou False.
        """
        if not user or not user.is_authenticated:
            return False

        # Superuser et staff ont tous les droits
        if user.is_superuser or user.is_staff:
            return True

        try:
            personnel = Personnel.objects.get(per_user=user)
        except Personnel.DoesNotExist:
            return False

        field_name = f"ppers_is_{perm_name}"

        # Vérifie que le champ existe bien dans le modèle
        if field_name not in [f.name for f in PersonnelPermission._meta.fields]:
            raise ValueError(f"Permission '{field_name}' inexistante dans PersonnelPermission.")

        return PersonnelPermission.objects.filter(
            ppers_personnel=personnel,
            ppers_actif=actif,
            **{field_name: True}
        ).exists()
    
    class Meta:
        verbose_name="Permission personnel"
        db_table = 'personnel_permission'
        ordering = ("ppers_personnel", "ppers_actif")
        constraints = [
            models.UniqueConstraint(fields=['ppers_personnel'], name='unique_personnel_permission')
        ]


@admin.register(PersonnelPermission)
class PersonnelPermissionAdmin(admin.ModelAdmin):

    # ========================
    # LIST DISPLAY
    # ========================
    list_display = (
        'ppers_personnel',
        'ppers_actif',
        'col_modules',
        'ppers_created_at'
    )

    # ========================
    # FILTRES
    # ========================
    list_filter = (
        'ppers_actif',
        'ppers_is_tdb',
        'ppers_is_creator',
        'ppers_is_listing',
        'ppers_is_detail',
        'ppers_is_importer',
        'ppers_is_effectif',
        'ppers_is_repartition_generale',
        'ppers_is_dossier',
        'ppers_is_sanction',
        'ppers_is_enfant',
        'ppers_is_absence_medicale',
        'ppers_is_mouvement',
        "ppers_is_accident_travail",
        "ppers_is_rattachement",
        "ppers_is_rattachement_desactiver",
    )

    # ========================
    # RECHERCHE
    # ========================
    search_fields = (
        'ppers_personnel__per_nom',
        'ppers_personnel__per_prenom',
        'ppers_personnel__per_matricule',
    )

    # ========================
    # ORDERING
    # ========================
    ordering = ('ppers_personnel',)

    # ========================
    # AUTOCOMPLETE (important)
    # ========================
    autocomplete_fields = ('ppers_personnel', )

    # ========================
    # READONLY
    # ========================
    readonly_fields = (
        'ppers_created_at',
        'ppers_updated_at',
        'ppers_created_by',
        'ppers_updated_by',
    )

    # ========================
    # FIELDSETS (UX PRO)
    # ========================
    fieldsets = (
        ("Informations générales", {
            'fields': (
                'ppers_personnel',
                'ppers_actif',
            )
        }),

        ("Permissions principales", {
            'fields': (
                'ppers_is_tdb',
                'ppers_is_creator',
                'ppers_is_listing',
                'ppers_is_detail',
                'ppers_is_importer',
            )
        }),

        ("Modules RH", {
            'fields': (
                'ppers_is_effectif',
                'ppers_is_repartition_generale',
                'ppers_is_dossier',
                'ppers_is_sanction',
                'ppers_is_enfant',
                'ppers_is_absence_medicale',
                'ppers_is_mouvement',
                "ppers_is_accident_travail",
                "ppers_is_rattachement",
                "ppers_is_rattachement_desactiver",
            )
        }),

        ("Audit", {
            'fields': (
                'ppers_created_at',
                'ppers_created_by',
                'ppers_updated_at',
                'ppers_updated_by',
            )
        }),
    )

    # ========================
    # SAVE LOGIC (AUTO USER)
    # ========================
    def save_model(self, request, obj, form, change):
        if not obj.ppers_created_by:
            obj.ppers_created_by = request.user
        obj.ppers_updated_by = request.user
        super().save_model(request, obj, form, change)

    # ========================
    # AFFICHAGE CUSTOM (UX)
    # ========================
    def col_modules(self, obj):
        modules = []

        if obj.ppers_is_tdb:
            modules.append("TDB")
        if obj.ppers_is_dossier:
            modules.append("Dossier")
        if obj.ppers_is_sanction:
            modules.append("Sanction")
        if obj.ppers_is_absence_medicale:
            modules.append("Absence")
        if obj.ppers_is_mouvement:
            modules.append("Mouvement")
        if obj.ppers_is_rattachement:
            modules.append("Rattachement")
        if obj.ppers_is_rattachement_desactiver:
            modules.append("Désactivation rattachement")

        return ", ".join(modules) if modules else "Aucun"

    col_modules.short_description = "Modules actifs"



class TypeDocumentPersonnel(models.Model):
    """
    Paramétrage des types de documents (contrat, CIN, diplôme, etc.)
    """
    tdocp_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tdocp_code = models.CharField("Code", max_length=150, unique=True)
    tdocp_libelle = models.CharField("Libellé", max_length=200)
    tdocp_description = models.TextField("Description", blank=True, null=True)
    tdocp_actif = models.BooleanField(default=True)

    def __str__(self):
        return self.tdocp_libelle
    
    class Meta:
        verbose_name="Type de document personnel"
        db_table = 'personnel_type_document'
        ordering = ("tdocp_code",)


@admin.register(TypeDocumentPersonnel)
class TypeDocumentPersonnelAdmin(admin.ModelAdmin):
    list_display = (
        "tdocp_code",
        "tdocp_libelle",
        "tdocp_actif",
        "short_description",
    )

    search_fields = (
        "tdocp_code",
        "tdocp_libelle",
        "tdocp_description",
    )

    list_filter = ()

    fieldsets = (
        ("Informations générales", {
            "fields": (
                "tdocp_code",
                "tdocp_libelle",
                "tdocp_actif",
            )
        }),
        ("Détails", {
            "fields": (
                "tdocp_description",
            ),
            "classes": ("collapse",)  # section repliable
        }),
    )

    ordering = ("tdocp_code",)
    list_per_page = 20

    def short_description(self, obj):
        if obj.tdocp_description:
            return obj.tdocp_description[:50] + "..."
        return "-"
    
    short_description.short_description = "Description"


def normalize_code(libelle):
    """
    Génère un code unique propre à partir du libellé
    """
    text = unicodedata.normalize('NFKD', libelle).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-zA-Z0-9]+', '_', text)
    return text.upper().strip('_')


def remplir_type_documents_personnel():
    documents = [
        "Permission Exceptionnelle",
        "Attestation d'emploi, de retraite complémentaire",
        "Certificat de travail (Agent à radier)",
        "Certificat administratif (Agent à radier)",
        "Frais funéraire (Agent, Epoux, Enfant)",
        "Bulletin de visite d'embauche",
        "Décision de congé de maternité = Attestation de paiement de salaire",
        "Lettre de préavis de retraite",
        "Mésure displinaire",
        "Avis de radiation (Adressé à la banque)",
        "Décision de départ à la retraite",
        "Décision de secours après décès",
        "Décision de maintien en activité",
        "Lettre de sommation de congé",
        "Décision de repos pour allaitement",
        "Décision de congé éducation",
        "Décision de congé sans solde",
        "Liste des agents en repos maladie suivant les périodes demandées",
        "Liste des agents en congé suivant les périodes demandées",
        "Liste des agents sanctionnés",
        "Liste des agents recrutés",
        "Liste des agents radiés",
        "Liste des enfants à charge",
        "Liste des conjoints",
        "Situation de congé",
        "Relevé des provisions de congé non pris (valorisés)",
        "Indemnité de transport",
        "Listing du personnel suivant les besoins",
        "Effectif du personnel suivant les besoins",
        "Evolution de l'effectif suivant la période demandée",
    ]

    created_count = 0
    existing_count = 0

    for libelle in documents:
        code = normalize_code(libelle)

        obj, created = TypeDocumentPersonnel.objects.get_or_create(
            tdocp_code=code,
            defaults={
                "tdocp_libelle": libelle,
                "tdocp_description": libelle
            }
        )

        if created:
            created_count += 1
        else:
            existing_count += 1

    return {
        "created": created_count,
        "existing": existing_count
    }


def personnel_folder_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}.{ext}"
    return f"personnel/{instance.dosp_pers.per_matricule}/{filename}"


class DossierPersonnel(models.Model):
    """
    Dossiers numériques du personnel (GED RH)
    """
    dosp_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dosp_pers = models.ForeignKey( Personnel, on_delete=models.CASCADE, related_name="dossiers_personnel" )
    dosp_numero = models.CharField( "N° du fichier", max_length=255, blank=True, null=True )
    dosp_type_document = models.ForeignKey( TypeDocumentPersonnel, on_delete=models.PROTECT, verbose_name="Type de document" )
    dosp_fichier = models.FileField( upload_to=personnel_folder_path, verbose_name="Fichier" )
    dosp_nom_fichier = models.CharField( "Nom du fichier", max_length=255)
    dosp_date_document = models.DateField( "Date du document", help_text="Date de signature ou d'émission", blank=True, null=True )
    dosp_date_expiration = models.DateField( "Date d'expiration", blank=True, null=True )
    dosp_commentaire = models.TextField( "Commentaire", blank=True, null=True )
    dosp_actif = models.BooleanField(default=True)
    dosp_cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dossiers_crees"
    )

    dosp_date_creation = models.DateTimeField(auto_now_add=True)
    dosp_date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "personnel_dossier"
        verbose_name = "Dossier du personnel"
        verbose_name_plural = "Dossiers du personnel"
        ordering = ("-dosp_date_creation",)
        indexes = [
            models.Index(fields=["dosp_pers"]),
            models.Index(fields=["dosp_type_document"]),
            models.Index(fields=["dosp_date_expiration"]),
        ]

    def __str__(self):
        return f"{self.dosp_pers} - {self.dosp_type_document}"
    

@admin.register(DossierPersonnel)
class DossierPersonnelAdmin(admin.ModelAdmin):

    list_display = (
        "dosp_pers",
        "dosp_type_document",
        "dosp_numero",
        "dosp_nom_fichier",
        "dosp_date_document",
        "dosp_date_expiration",
        "dosp_actif",
    )

    autocomplete_fields = ("dosp_pers",)

    search_fields = (
        "dosp_pers__per_nom",
        "dosp_pers__per_matricule",
        "dosp_numero",
        "dosp_nom_fichier",
    )

    list_filter = (
        "dosp_type_document",
        "dosp_actif",
        "dosp_date_expiration",
    )

    ordering = ("-dosp_date_creation",)

    readonly_fields = (
        "dosp_id",
        "dosp_cree_par",
        "dosp_date_creation",
        "dosp_date_modification",
    )

    fieldsets = (
        ("Identification", {
            "fields": (
                "dosp_id",
                "dosp_pers",
                "dosp_type_document",
            )
        }),
        ("Document", {
            "fields": (
                "dosp_fichier",
                "dosp_numero",
                "dosp_nom_fichier",
            )
        }),
        ("Informations document", {
            "fields": (
                "dosp_date_document",
                "dosp_date_expiration",
                "dosp_commentaire",
            )
        }),
        ("Statut", {
            "fields": (
                "dosp_actif",
            )
        }),
        ("Traçabilité", {
            "fields": (
                "dosp_cree_par",
                "dosp_date_creation",
                "dosp_date_modification",
            ),
            "classes": ("collapse",)
        }),
    )

    list_per_page = 20


class HistoriqueDossier(models.Model):
    """
    Historique des actions sur les dossiers du personnel (audit GED)
    """

    hdoc_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hdoc_dossier = models.ForeignKey( DossierPersonnel, on_delete=models.CASCADE, related_name="historiques_dossier" )

    hdoc_action = models.CharField(
        "Action",
        max_length=50,
        choices=[
            ("CREATION", "Création"),
            ("MODIFICATION", "Modification"),
            ("SUPPRESSION", "Suppression"),
            ("CONSULTATION", "Consultation"),
        ]
    )

    hdoc_utilisateur = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historiques_actions"
    )

    hdoc_date_action = models.DateTimeField( "Date de l'action", auto_now_add=True )
    hdoc_description = models.TextField( "Description", blank=True, null=True )

    class Meta:
        db_table = "personnel_historique_dossier"
        verbose_name = "Historique dossier"
        verbose_name_plural = "Historiques des dossiers"
        ordering = ("-hdoc_date_action",)
        indexes = [
            models.Index(fields=["hdoc_dossier"]),
            models.Index(fields=["hdoc_action"]),
            models.Index(fields=["hdoc_date_action"]),
        ]

    def __str__(self):
        return f"{self.hdoc_action} - {self.hdoc_dossier}"
    

@admin.register(HistoriqueDossier)
class HistoriqueDossierAdmin(admin.ModelAdmin):

    list_display = (
        "hdoc_dossier",
        "hdoc_action",
        "hdoc_utilisateur",
        "hdoc_date_action",
    )

    autocomplete_fields = ("hdoc_dossier",)

    search_fields = (
        "hdoc_dossier__dosp_pers__per_nom",
        "hdoc_dossier__dosp_pers__per_matricule",
        "hdoc_action",
    )

    list_filter = (
        "hdoc_action",
        "hdoc_date_action",
    )

    ordering = ("-hdoc_date_action",)

    readonly_fields = (
        "hdoc_id",
        "hdoc_date_action",
    )

    fieldsets = (
        ("Identification", {
            "fields": (
                "hdoc_id",
                "hdoc_dossier",
            )
        }),
        ("Action", {
            "fields": (
                "hdoc_action",
                "hdoc_utilisateur",
            )
        }),
        ("Détails", {
            "fields": (
                "hdoc_description",
            )
        }),
        ("Traçabilité", {
            "fields": (
                "hdoc_date_action",
            ),
            "classes": ("collapse",)
        }),
    )

    list_per_page = 25
