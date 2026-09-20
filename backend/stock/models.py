import uuid
from django.db import models
from django.contrib import admin
from personnel.models import Personnel
from cdg_centre_responsabilite.models import CentreResponsabilite


# ============================================================
# Choix (enums)
# ============================================================
class EtatArticle(models.TextChoices):
    ACTIF = "actif", "Actif"
    INACTIF = "inactif", "Inactif"


class TypeDemande(models.TextChoices):
    NORMALE = "normale", "Normale"
    URGENCE = "urgence", "Urgence"


class StatutDemande(models.TextChoices):
    SOUMISE = "soumise", "Soumise"
    EN_COURS = "en_cours", "En cours"
    LIVREE = "livree", "Livrée"
    REFUSEE = "refusee", "Refusée"


class NiveauValidation(models.TextChoices):
    DEPT_DEMANDEUR = "dept_demandeur", "Chef de département (demandeur)"
    RESPONSABLE_STOCK = "responsable_stock", "Responsable stock"
    DEPT_APPRO = "dept_appro", "Chef de département (Approvisionnement)"


class StatutValidation(models.TextChoices):
    VALIDEE = "validee", "Validée"
    REFUSEE = "refusee", "Refusée"


class TypeInventaire(models.TextChoices):
    TOTAL = "total", "Total"
    PARTIEL = "partiel", "Partiel"


class StatutInventaire(models.TextChoices):
    EN_COURS = "en_cours", "En cours"
    CLOTURE = "cloture", "Clôturé"
    VALIDE = "valide", "Validé"


# ============================================================
# Classification / référentiels
# ============================================================
class Categorie(models.Model):
    cat_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cat_nom = models.CharField("Nom", max_length=150)
    cat_parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Catégorie parente", related_name="sous_categories"
    )

    def __str__(self):
        return self.cat_nom

    class Meta:
        db_table = 'stock_categorie'
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"


class Emplacement(models.Model):
    emp_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    emp_code = models.CharField("Code", max_length=20, unique=True)  # ex: RACK12
    emp_description = models.CharField("Description", max_length=150, blank=True, null=True)

    def __str__(self):
        return self.emp_code

    class Meta:
        db_table = 'stock_emplacement'
        verbose_name = "Emplacement"


class Fournisseur(models.Model):
    frn_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    frn_code = models.CharField("Code", max_length=20, unique=True, blank=True, null=True)
    frn_nom = models.CharField("Nom", max_length=150)
    frn_contact = models.CharField("Contact", max_length=100, blank=True, null=True)
    frn_telephone = models.CharField("Téléphone", max_length=30, blank=True, null=True)
    frn_email = models.CharField("Email", max_length=100, blank=True, null=True)
    frn_adresse = models.CharField("Adresse", max_length=255, blank=True, null=True)

    def __str__(self):
        return self.frn_nom

    class Meta:
        db_table = 'stock_fournisseur'
        verbose_name = "Fournisseur"


class Article(models.Model):
    art_code_article = models.CharField("Code article", max_length=20, primary_key=True)
    art_designation = models.CharField("Désignation", max_length=150)
    art_reference = models.CharField("Référence", max_length=50, blank=True, null=True)
    art_categorie = models.ForeignKey(Categorie, on_delete=models.PROTECT, verbose_name="Catégorie", related_name="articles")
    art_emplacement = models.ForeignKey(Emplacement, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Emplacement", related_name="articles")
    art_unite = models.CharField("Unité", max_length=20, default="piece")
    art_prix_unitaire = models.DecimalField("Prix unitaire (référence)", max_digits=12, decimal_places=2, default=0)
    art_quantite_stock = models.IntegerField("Quantité en stock", default=0)
    art_seuil_min = models.IntegerField("Seuil minimum", default=0)
    art_seuil_max = models.IntegerField("Seuil maximum", blank=True, null=True)
    art_etat = models.CharField("État", max_length=10, choices=EtatArticle.choices, default=EtatArticle.ACTIF)
    art_created_at = models.DateTimeField("Date création", auto_now_add=True)
    art_updated_at = models.DateTimeField("Date modification", auto_now=True)

    def est_en_alerte(self):
        return self.art_quantite_stock < self.art_seuil_min

    def __str__(self):
        return f"{self.art_code_article} - {self.art_designation}"

    class Meta:
        db_table = 'stock_article'
        verbose_name = "Article"


# ============================================================
# Demandes de fourniture + circuit de validation
# ============================================================
class Demande(models.Model):
    dem_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dem_numero = models.CharField("N° demande", max_length=20, unique=True)
    dem_centre_responsabilite = models.ForeignKey(CentreResponsabilite, on_delete=models.PROTECT, verbose_name="Service demandeur", related_name="demandes")
    dem_demandeur = models.ForeignKey(Personnel, on_delete=models.PROTECT, verbose_name="Demandeur", related_name="demandes_soumises")
    dem_direction = models.CharField("Direction (snapshot)", max_length=100, blank=True, null=True)
    dem_date = models.DateTimeField("Date demande", auto_now_add=True)
    dem_type = models.CharField("Type", max_length=10, choices=TypeDemande.choices, default=TypeDemande.NORMALE)
    dem_motif = models.TextField("Motif", blank=True, null=True)
    dem_statut = models.CharField("Statut", max_length=10, choices=StatutDemande.choices, default=StatutDemande.SOUMISE)

    def calculer_statut_global(self):
        return self.dem_statut

    def __str__(self):
        return self.dem_numero

    class Meta:
        db_table = 'stock_demande'
        verbose_name = "Demande"


class LigneDemande(models.Model):
    ldem_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ldem_demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name="lignes")
    ldem_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_demande")
    ldem_quantite_demandee = models.IntegerField("Quantité demandée")
    ldem_quantite_accordee = models.IntegerField("Quantité accordée", default=0)
    ldem_remarque = models.CharField("Remarque", max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.ldem_article} x{self.ldem_quantite_demandee}"

    class Meta:
        db_table = 'stock_ligne_demande'
        verbose_name = "Ligne de demande"


class Validation(models.Model):
    val_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    val_demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name="validations")
    val_niveau = models.CharField("Niveau", max_length=20, choices=NiveauValidation.choices)
    val_statut = models.CharField("Statut", max_length=10, choices=StatutValidation.choices)
    val_validateur = models.ForeignKey(Personnel, on_delete=models.PROTECT, verbose_name="Validateur", related_name="validations_effectuees")
    val_date = models.DateTimeField("Date validation", auto_now_add=True)
    val_commentaire = models.TextField("Commentaire", blank=True, null=True)

    def __str__(self):
        return f"{self.val_demande} - {self.get_val_niveau_display()} - {self.get_val_statut_display()}"

    class Meta:
        db_table = 'stock_validation'
        verbose_name = "Validation"


def piece_jointe_path(instance, filename):
    return f"stock/demandes/{instance.pj_demande_id}/{filename}"


class PieceJointe(models.Model):
    pj_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pj_demande = models.ForeignKey(Demande, on_delete=models.CASCADE, null=True, blank=True, related_name="pieces_jointes")
    pj_nom_fichier = models.CharField("Nom du fichier", max_length=255)
    pj_fichier = models.FileField("Fichier", upload_to=piece_jointe_path)
    pj_ajoute_par = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, blank=True, related_name="pieces_jointes_ajoutees")
    pj_date_ajout = models.DateTimeField("Date ajout", auto_now_add=True)

    def __str__(self):
        return self.pj_nom_fichier

    class Meta:
        db_table = 'stock_piece_jointe'
        verbose_name = "Pièce jointe"


# ============================================================
# Mouvements — en-tête + détail par type
# ============================================================
class Entree(models.Model):
    ent_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ent_numero = models.CharField("N° entrée", max_length=20, unique=True)
    ent_date = models.DateTimeField("Date entrée", auto_now_add=True)
    ent_fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True, related_name="entrees")
    ent_responsable = models.ForeignKey(Personnel, on_delete=models.PROTECT, related_name="entrees_enregistrees")
    ent_bl_reference = models.CharField("Référence BL/Facture", max_length=50, blank=True, null=True)
    ent_direction = models.CharField("Direction (snapshot)", max_length=100, blank=True, null=True)

    def __str__(self):
        return self.ent_numero

    class Meta:
        db_table = 'stock_entree'
        verbose_name = "Entrée"


class EntreeDetail(models.Model):
    entd_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entd_entree = models.ForeignKey(Entree, on_delete=models.CASCADE, related_name="lignes")
    entd_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_entree")
    entd_quantite = models.IntegerField("Quantité")
    entd_prix_unitaire = models.DecimalField("Prix unitaire", max_digits=12, decimal_places=2)

    def calculer_montant(self):
        return self.entd_quantite * self.entd_prix_unitaire

    class Meta:
        db_table = 'stock_entree_detail'
        verbose_name = "Ligne d'entrée"


class Sortie(models.Model):
    sor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sor_numero = models.CharField("N° sortie", max_length=20, unique=True)
    sor_date = models.DateTimeField("Date sortie", auto_now_add=True)
    sor_demande = models.ForeignKey(Demande, on_delete=models.SET_NULL, null=True, blank=True, related_name="sorties")
    sor_centre_responsabilite = models.ForeignKey(CentreResponsabilite, on_delete=models.PROTECT, related_name="sorties")
    sor_responsable = models.ForeignKey(Personnel, on_delete=models.PROTECT, related_name="sorties_enregistrees")
    sor_direction = models.CharField("Direction (snapshot)", max_length=100, blank=True, null=True)

    def __str__(self):
        return self.sor_numero

    class Meta:
        db_table = 'stock_sortie'
        verbose_name = "Sortie"


class SortieDetail(models.Model):
    sord_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sord_sortie = models.ForeignKey(Sortie, on_delete=models.CASCADE, related_name="lignes")
    sord_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_sortie")
    sord_quantite = models.IntegerField("Quantité")

    class Meta:
        db_table = 'stock_sortie_detail'
        verbose_name = "Ligne de sortie"


class Retour(models.Model):
    ret_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ret_numero = models.CharField("N° retour", max_length=20, unique=True)
    ret_date = models.DateTimeField("Date retour", auto_now_add=True)
    ret_centre_responsabilite = models.ForeignKey(CentreResponsabilite, on_delete=models.PROTECT, related_name="retours")
    ret_responsable = models.ForeignKey(Personnel, on_delete=models.PROTECT, related_name="retours_enregistres")

    def __str__(self):
        return self.ret_numero

    class Meta:
        db_table = 'stock_retour'
        verbose_name = "Retour"


class RetourDetail(models.Model):
    retd_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    retd_retour = models.ForeignKey(Retour, on_delete=models.CASCADE, related_name="lignes")
    retd_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_retour")
    retd_quantite = models.IntegerField("Quantité")
    retd_etat_article = models.CharField("État de l'article", max_length=50, blank=True, null=True)  # ex: défectueux, surplus

    class Meta:
        db_table = 'stock_retour_detail'
        verbose_name = "Ligne de retour"


class DotationDirecte(models.Model):
    dot_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dot_numero = models.CharField("N° dotation", max_length=20, unique=True)
    dot_date = models.DateTimeField("Date dotation", auto_now_add=True)
    dot_centre_responsabilite = models.ForeignKey(CentreResponsabilite, on_delete=models.PROTECT, related_name="dotations")
    dot_responsable = models.ForeignKey(Personnel, on_delete=models.PROTECT, related_name="dotations_enregistrees")
    dot_justification = models.TextField("Justification")

    def __str__(self):
        return self.dot_numero

    class Meta:
        db_table = 'stock_dotation_directe'
        verbose_name = "Dotation directe"


class DotationDirecteDetail(models.Model):
    dotd_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dotd_dotation = models.ForeignKey(DotationDirecte, on_delete=models.CASCADE, related_name="lignes")
    dotd_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_dotation")
    dotd_quantite = models.IntegerField("Quantité")

    class Meta:
        db_table = 'stock_dotation_directe_detail'
        verbose_name = "Ligne de dotation"


# ============================================================
# Inventaire
# ============================================================
class Inventaire(models.Model):
    inv_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inv_numero = models.CharField("N° inventaire", max_length=20, unique=True)
    inv_type = models.CharField("Type", max_length=10, choices=TypeInventaire.choices, default=TypeInventaire.TOTAL)
    inv_statut = models.CharField("Statut", max_length=10, choices=StatutInventaire.choices, default=StatutInventaire.EN_COURS)
    inv_date_debut = models.DateField("Date début")
    inv_date_fin = models.DateField("Date fin", blank=True, null=True)
    inv_responsable = models.ForeignKey(Personnel, on_delete=models.PROTECT, related_name="inventaires_geres")
    inv_validateur = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, blank=True, related_name="inventaires_valides")

    def __str__(self):
        return self.inv_numero

    class Meta:
        db_table = 'stock_inventaire'
        verbose_name = "Inventaire"


class LigneInventaire(models.Model):
    linv_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    linv_inventaire = models.ForeignKey(Inventaire, on_delete=models.CASCADE, related_name="lignes")
    linv_article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_inventaire")
    linv_quantite_theorique = models.IntegerField("Quantité théorique")
    linv_quantite_reelle = models.IntegerField("Quantité réelle")
    linv_valeur_theorique = models.DecimalField("Valeur théorique", max_digits=14, decimal_places=2, blank=True, null=True)
    linv_valeur_ecart = models.DecimalField("Valeur de l'écart", max_digits=14, decimal_places=2, blank=True, null=True)
    linv_note = models.TextField("Note", blank=True, null=True)

    def calculer_ecart(self):
        return self.linv_quantite_reelle - self.linv_quantite_theorique

    class Meta:
        db_table = 'stock_ligne_inventaire'
        verbose_name = "Ligne d'inventaire"


# ============================================================
# Journal d'audit métier
# ============================================================
class JournalAudit(models.Model):
    aud_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aud_personnel = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, related_name="actions_journal")
    aud_action = models.CharField("Action", max_length=100)
    aud_details = models.TextField("Détails", blank=True, null=True)
    aud_date = models.DateTimeField("Date action", auto_now_add=True)

    def __str__(self):
        return f"{self.aud_action} - {self.aud_date}"

    class Meta:
        db_table = 'stock_journal_audit'
        verbose_name = "Journal d'audit"


# ============================================================
# Admin
# ============================================================
@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ("cat_nom", "cat_parent")
    search_fields = ("cat_nom",)
    autocomplete_fields = ("cat_parent",)

@admin.register(Emplacement)
class EmplacementAdmin(admin.ModelAdmin):
    list_display = ("emp_code", "emp_description")
    search_fields = ("emp_code",)

@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ("frn_nom", "frn_contact", "frn_telephone")
    search_fields = ("frn_nom", "frn_code")

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("art_code_article", "art_designation", "art_categorie", "art_quantite_stock", "art_seuil_min", "art_etat")
    search_fields = ("art_code_article", "art_designation")
    list_filter = ("art_categorie", "art_etat")
    autocomplete_fields = ("art_categorie", "art_emplacement")

class LigneDemandeInline(admin.TabularInline):
    model = LigneDemande
    extra = 1

@admin.register(Demande)
class DemandeAdmin(admin.ModelAdmin):
    list_display = ("dem_numero", "dem_centre_responsabilite", "dem_demandeur", "dem_type", "dem_statut", "dem_date")
    search_fields = ("dem_numero",)
    list_filter = ("dem_statut", "dem_type")
    autocomplete_fields = ("dem_centre_responsabilite", "dem_demandeur")
    inlines = [LigneDemandeInline]

@admin.register(Validation)
class ValidationAdmin(admin.ModelAdmin):
    list_display = ("val_demande", "val_niveau", "val_statut", "val_validateur", "val_date")
    autocomplete_fields = ("val_demande", "val_validateur")

@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display = ("pj_nom_fichier", "pj_demande", "pj_date_ajout")

class EntreeDetailInline(admin.TabularInline):
    model = EntreeDetail
    extra = 1

@admin.register(Entree)
class EntreeAdmin(admin.ModelAdmin):
    list_display = ("ent_numero", "ent_fournisseur", "ent_responsable", "ent_date")
    autocomplete_fields = ("ent_fournisseur", "ent_responsable")
    inlines = [EntreeDetailInline]

class SortieDetailInline(admin.TabularInline):
    model = SortieDetail
    extra = 1

@admin.register(Sortie)
class SortieAdmin(admin.ModelAdmin):
    list_display = ("sor_numero", "sor_centre_responsabilite", "sor_demande", "sor_date")
    autocomplete_fields = ("sor_centre_responsabilite", "sor_demande", "sor_responsable")
    inlines = [SortieDetailInline]

class RetourDetailInline(admin.TabularInline):
    model = RetourDetail
    extra = 1

@admin.register(Retour)
class RetourAdmin(admin.ModelAdmin):
    list_display = ("ret_numero", "ret_centre_responsabilite", "ret_date")
    autocomplete_fields = ("ret_centre_responsabilite", "ret_responsable")
    inlines = [RetourDetailInline]

class DotationDetailInline(admin.TabularInline):
    model = DotationDirecteDetail
    extra = 1

@admin.register(DotationDirecte)
class DotationDirecteAdmin(admin.ModelAdmin):
    list_display = ("dot_numero", "dot_centre_responsabilite", "dot_date")
    autocomplete_fields = ("dot_centre_responsabilite", "dot_responsable")
    inlines = [DotationDetailInline]

class LigneInventaireInline(admin.TabularInline):
    model = LigneInventaire
    extra = 1

@admin.register(Inventaire)
class InventaireAdmin(admin.ModelAdmin):
    list_display = ("inv_numero", "inv_type", "inv_statut", "inv_date_debut", "inv_date_fin", "inv_responsable")
    autocomplete_fields = ("inv_responsable", "inv_validateur")
    inlines = [LigneInventaireInline]

@admin.register(JournalAudit)
class JournalAuditAdmin(admin.ModelAdmin):
    list_display = ("aud_action", "aud_personnel", "aud_date")
    list_filter = ("aud_action",)