import uuid
from decimal import Decimal
from django.db import models, transaction
from django.contrib import admin
from django.utils import timezone
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

    def lister_sous_categories(self):
        """Retourne les catégories filles directes (niveau Famille/Sous-famille)."""
        return self.sous_categories.all()

    def lister_articles(self, inclure_sous_categories=True):
        """Retourne les articles de cette catégorie, et de ses sous-catégories si demandé."""
        if not inclure_sous_categories:
            return self.articles.all()
        ids = [self.cat_id]
        a_traiter = [self]
        while a_traiter:
            courante = a_traiter.pop()
            enfants = list(courante.sous_categories.all())
            ids += [c.cat_id for c in enfants]
            a_traiter += enfants
        return Article.objects.filter(art_categorie_id__in=ids)

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

    def lister_articles(self):
        return self.articles.all()

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

    def historique_livraisons(self):
        """Toutes les entrées de stock livrées par ce fournisseur."""
        return self.entrees.all().order_by('-ent_date')

    def lister_articles_fournis(self):
        """Articles distincts déjà reçus de ce fournisseur (via ses entrées)."""
        article_ids = EntreeDetail.objects.filter(
            entd_entree__ent_fournisseur=self
        ).values_list('entd_article_id', flat=True).distinct()
        return Article.objects.filter(art_code_article__in=article_ids)

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

    # Sens de mouvement qui augmentent le stock vs le diminuent
    MOUVEMENTS_ENTRANTS = ("entree", "retour")
    MOUVEMENTS_SORTANTS = ("sortie", "dotation")

    def maj_stock(self, quantite, type_mouvement):
        """
        Met à jour la quantité en stock selon le type de mouvement.
        type_mouvement : 'entree' | 'sortie' | 'retour' | 'dotation'
        Lève ValueError si le stock deviendrait négatif.
        """
        if type_mouvement in self.MOUVEMENTS_ENTRANTS:
            self.art_quantite_stock += quantite
        elif type_mouvement in self.MOUVEMENTS_SORTANTS:
            if self.art_quantite_stock - quantite < 0:
                raise ValueError(
                    f"Stock insuffisant pour {self.art_code_article} : "
                    f"disponible {self.art_quantite_stock}, demandé {quantite}"
                )
            self.art_quantite_stock -= quantite
        else:
            raise ValueError(f"Type de mouvement inconnu : {type_mouvement}")
        self.save(update_fields=["art_quantite_stock", "art_updated_at"])
        return self.art_quantite_stock

    def est_en_alerte(self):
        return self.art_quantite_stock < self.art_seuil_min

    def calculer_valeur_stock(self):
        """Valeur financière du stock actuel de cet article (quantité x prix)."""
        return self.art_quantite_stock * self.art_prix_unitaire

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

    @staticmethod
    def _generer_numero():
        annee = timezone.now().year
        dernier = Demande.objects.filter(dem_numero__startswith=f"DEM-{annee}-").order_by("-dem_numero").first()
        seq = int(dernier.dem_numero.split("-")[-1]) + 1 if dernier else 1
        return f"DEM-{annee}-{seq:04d}"

    def ajouter_ligne(self, article, quantite_demandee, remarque=""):
        """Ajoute une ligne d'article à la demande (avant soumission)."""
        return LigneDemande.objects.create(
            ldem_demande=self, ldem_article=article,
            ldem_quantite_demandee=quantite_demandee, ldem_remarque=remarque,
        )

    def soumettre(self):
        """Passe la demande à l'état 'soumise' — nécessite au moins une ligne."""
        if not self.lignes.exists():
            raise ValueError("Impossible de soumettre une demande sans article.")
        if self.dem_type == TypeDemande.URGENCE and not self.dem_motif:
            raise ValueError("Un motif est obligatoire pour une demande d'urgence.")
        self.dem_statut = StatutDemande.SOUMISE
        self.save(update_fields=["dem_statut"])
        JournalAudit.enregistrer_action(self.dem_demandeur, "demande_soumise", f"{self.dem_numero}")

    def annuler(self, motif=""):
        """Annule la demande tant qu'elle n'a pas encore été livrée."""
        if self.dem_statut == StatutDemande.LIVREE:
            raise ValueError("Une demande déjà livrée ne peut plus être annulée.")
        self.dem_statut = StatutDemande.REFUSEE
        self.dem_motif = (self.dem_motif or "") + f"\n[Annulée par le demandeur] {motif}"
        self.save(update_fields=["dem_statut", "dem_motif"])

    def calculer_statut_global(self):
        """Dérive un libellé lisible du statut actuel à partir des validations enregistrées."""
        derniere = self.validations.order_by("-val_date").first()
        if derniere and derniere.val_statut == StatutValidation.REFUSEE:
            return f"Refusée ({derniere.get_val_niveau_display()})"
        return self.get_dem_statut_display()

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

    def accorder_quantite(self, quantite):
        """Fixe la quantité accordée par le Responsable stock (accord total ou partiel)."""
        if quantite < 0 or quantite > self.ldem_quantite_demandee:
            raise ValueError("La quantité accordée doit être comprise entre 0 et la quantité demandée.")
        self.ldem_quantite_accordee = quantite
        self.save(update_fields=["ldem_quantite_accordee"])

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

    @classmethod
    @transaction.atomic
    def enregistrer(cls, demande, niveau, validateur, statut, commentaire=""):
        """
        Enregistre une étape de validation et fait avancer le statut global
        de la demande en conséquence (refus à n'importe quel niveau = REFUSEE).
        """
        validation = cls.objects.create(
            val_demande=demande, val_niveau=niveau, val_validateur=validateur,
            val_statut=statut, val_commentaire=commentaire,
        )
        if statut == StatutValidation.REFUSEE:
            demande.dem_statut = StatutDemande.REFUSEE
        elif niveau == NiveauValidation.RESPONSABLE_STOCK:
            demande.dem_statut = StatutDemande.EN_COURS
        demande.save(update_fields=["dem_statut"])
        JournalAudit.enregistrer_action(
            validateur, "demande_validation",
            f"{demande.dem_numero} - {niveau} - {statut}"
        )
        return validation

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
    ent_appliquee = models.BooleanField("Appliquée au stock", default=False, editable=False)

    def ajouter_ligne(self, article, quantite, prix_unitaire):
        if self.ent_appliquee:
            raise ValueError("Impossible d'ajouter une ligne : cette entrée a déjà été appliquée au stock.")
        return EntreeDetail.objects.create(
            entd_entree=self, entd_article=article,
            entd_quantite=quantite, entd_prix_unitaire=prix_unitaire,
        )

    @transaction.atomic
    def enregistrer(self):
        """Applique toutes les lignes de l'entrée au stock (une seule fois)."""
        if self.ent_appliquee:
            raise ValueError("Cette entrée a déjà été appliquée au stock.")
        for ligne in self.lignes.select_related("entd_article"):
            ligne.entd_article.maj_stock(ligne.entd_quantite, "entree")
        self.ent_appliquee = True
        self.save(update_fields=["ent_appliquee"])
        JournalAudit.enregistrer_action(self.ent_responsable, "entree_enregistree", self.ent_numero)

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
    sor_appliquee = models.BooleanField("Appliquée au stock", default=False, editable=False)

    @staticmethod
    def _generer_numero():
        annee = timezone.now().year
        dernier = Sortie.objects.filter(sor_numero__startswith=f"SOR-{annee}-").order_by("-sor_numero").first()
        seq = int(dernier.sor_numero.split("-")[-1]) + 1 if dernier else 1
        return f"SOR-{annee}-{seq:04d}"

    @classmethod
    @transaction.atomic
    def generer_depuis_demande(cls, demande, responsable):
        """
        Crée la sortie et ses lignes à partir des quantités accordées
        d'une demande validée à tous les niveaux, puis livre le stock.
        """
        sortie = cls.objects.create(
            sor_numero=cls._generer_numero(),
            sor_demande=demande,
            sor_centre_responsabilite=demande.dem_centre_responsabilite,
            sor_responsable=responsable,
            sor_direction=demande.dem_direction,
        )
        for ligne in demande.lignes.filter(ldem_quantite_accordee__gt=0):
            SortieDetail.objects.create(
                sord_sortie=sortie, sord_article=ligne.ldem_article,
                sord_quantite=ligne.ldem_quantite_accordee,
            )
        sortie.enregistrer()
        demande.dem_statut = StatutDemande.LIVREE
        demande.save(update_fields=["dem_statut"])
        return sortie

    @transaction.atomic
    def enregistrer(self):
        """Applique toutes les lignes de la sortie au stock (décrémente)."""
        if self.sor_appliquee:
            raise ValueError("Cette sortie a déjà été appliquée au stock.")
        for ligne in self.lignes.select_related("sord_article"):
            ligne.sord_article.maj_stock(ligne.sord_quantite, "sortie")
        self.sor_appliquee = True
        self.save(update_fields=["sor_appliquee"])
        JournalAudit.enregistrer_action(self.sor_responsable, "sortie_enregistree", self.sor_numero)

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
    ret_appliquee = models.BooleanField("Appliquée au stock", default=False, editable=False)

    def ajouter_ligne(self, article, quantite, etat_article=""):
        return RetourDetail.objects.create(
            retd_retour=self, retd_article=article,
            retd_quantite=quantite, retd_etat_article=etat_article,
        )

    @transaction.atomic
    def enregistrer(self):
        """
        Applique le retour au stock. Seuls les articles en bon état réintègrent
        le stock disponible ; un article 'défectueux' est tracé mais pas réintégré.
        """
        if self.ret_appliquee:
            raise ValueError("Ce retour a déjà été appliqué au stock.")
        for ligne in self.lignes.select_related("retd_article"):
            if (ligne.retd_etat_article or "").strip().lower() != "défectueux":
                ligne.retd_article.maj_stock(ligne.retd_quantite, "retour")
        self.ret_appliquee = True
        self.save(update_fields=["ret_appliquee"])
        JournalAudit.enregistrer_action(self.ret_responsable, "retour_enregistre", self.ret_numero)

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
    dot_appliquee = models.BooleanField("Appliquée au stock", default=False, editable=False)

    def ajouter_ligne(self, article, quantite):
        return DotationDirecteDetail.objects.create(
            dotd_dotation=self, dotd_article=article, dotd_quantite=quantite,
        )

    @transaction.atomic
    def enregistrer(self):
        if self.dot_appliquee:
            raise ValueError("Cette dotation a déjà été appliquée au stock.")
        for ligne in self.lignes.select_related("dotd_article"):
            ligne.dotd_article.maj_stock(ligne.dotd_quantite, "dotation")
        self.dot_appliquee = True
        self.save(update_fields=["dot_appliquee"])
        JournalAudit.enregistrer_action(self.dot_responsable, "dotation_enregistree", self.dot_numero)

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

    @classmethod
    def demarrer(cls, numero, responsable, type_inventaire=TypeInventaire.TOTAL, articles=None):
        """Crée un inventaire et pré-remplit une ligne par article avec la quantité théorique actuelle."""
        inventaire = cls.objects.create(
            inv_numero=numero, inv_type=type_inventaire,
            inv_date_debut=timezone.now().date(), inv_responsable=responsable,
        )
        articles = articles if articles is not None else Article.objects.filter(art_etat=EtatArticle.ACTIF)
        LigneInventaire.objects.bulk_create([
            LigneInventaire(
                linv_inventaire=inventaire, linv_article=a,
                linv_quantite_theorique=a.art_quantite_stock, linv_quantite_reelle=a.art_quantite_stock,
            ) for a in articles
        ])
        return inventaire

    def calculer_ecarts(self):
        """Recalcule la valorisation de chaque ligne à partir du prix de référence de l'article."""
        for ligne in self.lignes.select_related("linv_article"):
            ligne.calculer_valeur_ecart()

    @transaction.atomic
    def cloturer(self, validateur=None):
        """Clôture l'inventaire : fige les écarts et ajuste le stock réel des articles."""
        if self.inv_statut == StatutInventaire.CLOTURE:
            raise ValueError("Cet inventaire est déjà clôturé.")
        self.calculer_ecarts()
        for ligne in self.lignes.select_related("linv_article"):
            article = ligne.linv_article
            article.art_quantite_stock = ligne.linv_quantite_reelle
            article.save(update_fields=["art_quantite_stock", "art_updated_at"])
        self.inv_statut = StatutInventaire.CLOTURE
        self.inv_date_fin = timezone.now().date()
        if validateur:
            self.inv_validateur = validateur
        self.save(update_fields=["inv_statut", "inv_date_fin", "inv_validateur"])
        JournalAudit.enregistrer_action(validateur or self.inv_responsable, "inventaire_cloture", self.inv_numero)

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

    def calculer_valeur_ecart(self):
        """Valorise l'écart et la quantité théorique au prix de référence de l'article, et sauvegarde."""
        prix = self.linv_article.art_prix_unitaire
        self.linv_valeur_theorique = self.linv_quantite_theorique * prix
        self.linv_valeur_ecart = self.calculer_ecart() * prix
        self.save(update_fields=["linv_valeur_theorique", "linv_valeur_ecart"])
        return self.linv_valeur_ecart

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

    @classmethod
    def enregistrer_action(cls, personnel, action, details=""):
        """Point d'entrée unique pour journaliser une action métier sensible."""
        return cls.objects.create(aud_personnel=personnel, aud_action=action, aud_details=details)

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
    list_display = ("ent_numero", "ent_fournisseur", "ent_responsable", "ent_date", "ent_appliquee")
    autocomplete_fields = ("ent_fournisseur", "ent_responsable")
    inlines = [EntreeDetailInline]

class SortieDetailInline(admin.TabularInline):
    model = SortieDetail
    extra = 1

@admin.register(Sortie)
class SortieAdmin(admin.ModelAdmin):
    list_display = ("sor_numero", "sor_centre_responsabilite", "sor_demande", "sor_date", "sor_appliquee")
    autocomplete_fields = ("sor_centre_responsabilite", "sor_demande", "sor_responsable")
    inlines = [SortieDetailInline]

class RetourDetailInline(admin.TabularInline):
    model = RetourDetail
    extra = 1

@admin.register(Retour)
class RetourAdmin(admin.ModelAdmin):
    list_display = ("ret_numero", "ret_centre_responsabilite", "ret_date", "ret_appliquee")
    autocomplete_fields = ("ret_centre_responsabilite", "ret_responsable")
    inlines = [RetourDetailInline]

class DotationDetailInline(admin.TabularInline):
    model = DotationDirecteDetail
    extra = 1

@admin.register(DotationDirecte)
class DotationDirecteAdmin(admin.ModelAdmin):
    list_display = ("dot_numero", "dot_centre_responsabilite", "dot_date", "dot_appliquee")
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
