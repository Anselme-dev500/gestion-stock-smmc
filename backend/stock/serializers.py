import re

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Categorie,
    Emplacement,
    Fournisseur,
    Article,

    Demande,
    LigneDemande,
    Validation,
    PieceJointe,

    Entree,
    EntreeDetail,

    Sortie,
    SortieDetail,

    Retour,
    RetourDetail,

    DotationDirecte,
    DotationDirecteDetail,

    Inventaire,
    LigneInventaire,

    JournalAudit,
)


# ============================================================
# CATEGORIE
# ============================================================

class CategorieSerializer(serializers.ModelSerializer):

    sous_categories = serializers.SerializerMethodField()
    nombre_articles = serializers.SerializerMethodField()

    class Meta:
        model = Categorie
        fields = [
            "cat_id",
            "cat_nom",
            "cat_parent",
            "sous_categories",
            "nombre_articles",
        ]

    def get_sous_categories(self, obj):
        return [
            {
                "cat_id": str(c.cat_id),
                "cat_nom": c.cat_nom,
            }
            for c in obj.lister_sous_categories()
        ]

    def get_nombre_articles(self, obj):
        return obj.lister_articles().count()

    def validate_cat_nom(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom de la catégorie est obligatoire.")
        return value

    def validate(self, attrs):
        parent = attrs.get("cat_parent")
        instance = self.instance

        if parent is None:
            return attrs
        if instance is not None and parent.pk == instance.pk:
            raise serializers.ValidationError({
                "cat_parent": "Une catégorie ne peut pas être sa propre parente."
            })

        # A parent must not be one of the category's descendants: that would
        # create an infinite loop in the hierarchy.
        ancestor = parent
        parent_depth = 0
        while ancestor is not None:
            if instance is not None and ancestor.pk == instance.pk:
                raise serializers.ValidationError({
                    "cat_parent": "Une sous-catégorie ne peut pas devenir la parente de sa catégorie."
                })
            parent_depth += 1
            ancestor = ancestor.cat_parent

        # Root = level 0, Family = 1, Sub-family = 2.
        if parent_depth > 2:
            raise serializers.ValidationError({
                "cat_parent": "La hiérarchie est limitée à trois niveaux : Catégorie, Famille, Sous-famille."
            })
        return attrs


# ============================================================
# EMPLACEMENT
# ============================================================

class EmplacementSerializer(serializers.ModelSerializer):

    nombre_articles = serializers.SerializerMethodField()

    class Meta:
        model = Emplacement
        fields = [
            "emp_id",
            "emp_code",
            "emp_description",
            "nombre_articles",
        ]

    def get_nombre_articles(self, obj):
        return obj.articles.count()


# ============================================================
# FOURNISSEUR
# ============================================================

class FournisseurSerializer(serializers.ModelSerializer):

    class Meta:
        model = Fournisseur
        fields = [
            "frn_id",
            "frn_code",
            "frn_nom",
            "frn_contact",
            "frn_telephone",
            "frn_email",
            "frn_adresse",
        ]

        read_only_fields = ["frn_code"]

    def validate_frn_nom(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom du fournisseur est obligatoire.")
        return value

    @staticmethod
    def _next_code():
        prefix = "FRN-"
        numbers = []
        for code in Fournisseur.objects.filter(frn_code__startswith=prefix).values_list("frn_code", flat=True):
            suffix = (code or "").removeprefix(prefix)
            if suffix.isdigit():
                numbers.append(int(suffix))
        return f"{prefix}{max(numbers, default=0) + 1:04d}"

    def create(self, validated_data):
        for _ in range(5):
            try:
                with transaction.atomic():
                    return Fournisseur.objects.create(frn_code=self._next_code(), **validated_data)
            except IntegrityError:
                continue
        raise serializers.ValidationError({"detail": "Impossible de générer un code fournisseur unique."})


# ============================================================
# ARTICLE
# ============================================================

class ArticleSerializer(serializers.ModelSerializer):

    categorie_nom = serializers.CharField(
        source="art_categorie.cat_nom",
        read_only=True
    )

    emplacement_code = serializers.CharField(
        source="art_emplacement.emp_code",
        read_only=True
    )

    alerte_stock = serializers.SerializerMethodField()
    valeur_stock = serializers.SerializerMethodField()
    stocks_emplacements = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "art_code_article",
            "art_rang",
            "art_test",
            "art_designation",
            "art_reference",
            "art_categorie",
            "categorie_nom",
            "art_emplacement",
            "emplacement_code",
            "art_unite",
            "art_prix_unitaire",
            "art_quantite_stock",
            "art_seuil_min",
            "art_seuil_max",
            "art_remarque",
            "art_etat",
            "art_created_at",
            "art_updated_at",
            "alerte_stock",
            "valeur_stock",
            "stocks_emplacements",
        ]

        read_only_fields = [
            # This identifier is generated by the server.  It must never be
            # editable after the article is created because it is the primary key.
            "art_code_article",
            "art_quantite_stock",
            "art_created_at",
            "art_updated_at",
        ]

    def validate_art_designation(self, value):
        designation = value.strip()
        if not designation:
            raise serializers.ValidationError("La désignation est obligatoire.")
        # A4, 16x22 et autres codes intégrés au libellé sont valides.
        return designation
        if not designation:
            raise serializers.ValidationError("La désignation est obligatoire.")
        # Numeric references such as A4 and 16x22 are valid SMMC designations.
        if False and any(character.isdigit() for character in designation):
            raise serializers.ValidationError(
                "La désignation ne doit pas contenir de chiffres."
            )
        if not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’().,&/\-]*", designation):
            raise serializers.ValidationError(
                "La désignation contient des caractères non autorisés."
            )
        return designation

    def get_stocks_emplacements(self, obj):
        """Expose les quantités par emplacement sans modifier le stock global."""
        return [
            {
                "emplacement": str(stock.ste_emplacement_id),
                "code": stock.ste_emplacement.emp_code,
                "quantite": stock.ste_quantite,
            }
            for stock in obj.stocks_emplacements.select_related("ste_emplacement").all()
        ]

    def validate(self, attrs):
        prix = attrs.get("art_prix_unitaire")
        seuil_min = attrs.get("art_seuil_min")
        seuil_max = attrs.get("art_seuil_max")

        if prix is not None and prix < 0:
            raise serializers.ValidationError({
                "art_prix_unitaire": "Le prix unitaire doit être positif ou nul."
            })
        if seuil_min is not None and seuil_min < 0:
            raise serializers.ValidationError({
                "art_seuil_min": "Le seuil minimum doit être positif ou nul."
            })

        # During an update, a missing field retains its current database value.
        if self.instance is not None:
            seuil_min = self.instance.art_seuil_min if seuil_min is None else seuil_min
            seuil_max = self.instance.art_seuil_max if seuil_max is None else seuil_max

        if seuil_max is not None and seuil_max < 0:
            raise serializers.ValidationError({
                "art_seuil_max": "Le seuil maximum doit être positif ou nul."
            })
        if seuil_max is not None and seuil_min is not None and seuil_max < seuil_min:
            raise serializers.ValidationError({
                "art_seuil_max": "Le seuil maximum doit être supérieur ou égal au seuil minimum."
            })
        return attrs

    @staticmethod
    def _next_code():
        """Returns the next human-readable, yearly article identifier."""
        prefix = f"ART-{timezone.localdate().year}-"
        codes = Article.objects.filter(
            art_code_article__startswith=prefix
        ).values_list("art_code_article", flat=True)
        numbers = []
        for code in codes:
            suffix = code.removeprefix(prefix)
            if suffix.isdigit():
                numbers.append(int(suffix))
        return f"{prefix}{(max(numbers, default=0) + 1):04d}"

    def create(self, validated_data):
        # Retry in the exceptional case where two users create an article at
        # exactly the same moment and obtain the same sequential number.
        for _ in range(5):
            try:
                with transaction.atomic():
                    return Article.objects.create(
                        art_code_article=self._next_code(),
                        **validated_data,
                    )
            except IntegrityError:
                continue
        raise serializers.ValidationError(
            {"detail": "Impossible de générer un code article unique. Réessayez."}
        )

    def get_alerte_stock(self, obj):
        return obj.est_en_alerte()

    def get_valeur_stock(self, obj):
        return obj.calculer_valeur_stock()


# ============================================================
# LIGNE DEMANDE
# ============================================================

class LigneDemandeSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="ldem_article.art_designation",
        read_only=True
    )

    class Meta:
        model = LigneDemande
        fields = [
            "ldem_id",
            "ldem_demande",
            "ldem_article",
            "article_designation",
            "ldem_quantite_demandee",
            "ldem_quantite_accordee",
            "ldem_remarque",
        ]

        read_only_fields = [
            "ldem_quantite_accordee",
        ]

    def validate_ldem_quantite_demandee(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "La quantité demandée doit être supérieure à 0."
            )
        return value


# ============================================================
# VALIDATION
# ============================================================

class ValidationSerializer(serializers.ModelSerializer):

    validateur_nom = serializers.SerializerMethodField()
    niveau_display = serializers.CharField(
        source="get_val_niveau_display",
        read_only=True
    )
    statut_display = serializers.CharField(
        source="get_val_statut_display",
        read_only=True
    )

    class Meta:
        model = Validation
        fields = [
            "val_id",
            "val_demande",
            "val_niveau",
            "niveau_display",
            "val_statut",
            "statut_display",
            "val_validateur",
            "validateur_nom",
            "val_date",
            "val_commentaire",
        ]

        read_only_fields = [
            "val_date",
        ]

    def get_validateur_nom(self, obj):
        return str(obj.val_validateur)


# ============================================================
# PIECE JOINTE
# ============================================================

class PieceJointeSerializer(serializers.ModelSerializer):

    class Meta:
        model = PieceJointe
        fields = [
            "pj_id",
            "pj_demande",
            "pj_nom_fichier",
            "pj_fichier",
            "pj_ajoute_par",
            "pj_date_ajout",
        ]

        read_only_fields = [
            "pj_date_ajout",
        ]


# ============================================================
# DEMANDE
# ============================================================

class DemandeSerializer(serializers.ModelSerializer):

    lignes = LigneDemandeSerializer(
        many=True,
        read_only=True
    )

    validations = ValidationSerializer(
        many=True,
        read_only=True
    )

    pieces_jointes = PieceJointeSerializer(
        many=True,
        read_only=True
    )

    demandeur_nom = serializers.SerializerMethodField()

    statut_display = serializers.CharField(
        source="get_dem_statut_display",
        read_only=True
    )

    type_display = serializers.CharField(
        source="get_dem_type_display",
        read_only=True
    )

    statut_global = serializers.SerializerMethodField()

    class Meta:
        model = Demande
        fields = [
            "dem_id",
            "dem_numero",
            "dem_centre_responsabilite",
            "dem_demandeur",
            "demandeur_nom",
            "dem_direction",
            "dem_date",
            "dem_type",
            "type_display",
            "dem_motif",
            "dem_statut",
            "statut_display",
            "statut_global",
            "lignes",
            "validations",
            "pieces_jointes",
        ]

        read_only_fields = [
            "dem_id",
            "dem_numero",
            "dem_date",
            "dem_statut",
        ]

    def get_demandeur_nom(self, obj):
        return str(obj.dem_demandeur)

    def get_statut_global(self, obj):
        return obj.calculer_statut_global()


# ============================================================
# ENTREE DETAIL
# ============================================================

class EntreeDetailSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="entd_article.art_designation",
        read_only=True
    )

    montant = serializers.SerializerMethodField()
    emplacement_code = serializers.CharField(source="entd_emplacement.emp_code", read_only=True)

    class Meta:
        model = EntreeDetail
        fields = [
            "entd_id",
            "entd_entree",
            "entd_article",
            "entd_emplacement",
            "emplacement_code",
            "article_designation",
            "entd_quantite",
            "entd_prix_unitaire",
            "montant",
        ]

    def get_montant(self, obj):
        return obj.calculer_montant()


# ============================================================
# ENTREE
# ============================================================

class EntreeSerializer(serializers.ModelSerializer):

    lignes = EntreeDetailSerializer(
        many=True,
        read_only=True
    )

    fournisseur_nom = serializers.SerializerMethodField()
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Entree
        fields = [
            "ent_id",
            "ent_numero",
            "ent_date",
            "ent_fournisseur",
            "fournisseur_nom",
            "ent_responsable",
            "responsable_nom",
            "ent_bl_reference",
            "ent_direction",
            "ent_appliquee",
            "lignes",
        ]

        read_only_fields = [
            "ent_id",
            "ent_date",
            "ent_appliquee",
        ]

    def get_fournisseur_nom(self, obj):
        return str(obj.ent_fournisseur) if obj.ent_fournisseur else None

    def get_responsable_nom(self, obj):
        return str(obj.ent_responsable)


# ============================================================
# SORTIE DETAIL
# ============================================================

class SortieDetailSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="sord_article.art_designation",
        read_only=True
    )
    emplacement_code = serializers.CharField(source="sord_emplacement.emp_code", read_only=True)

    class Meta:
        model = SortieDetail
        fields = [
            "sord_id",
            "sord_sortie",
            "sord_article",
            "sord_emplacement",
            "emplacement_code",
            "article_designation",
            "sord_quantite",
        ]


# ============================================================
# SORTIE
# ============================================================

class SortieSerializer(serializers.ModelSerializer):

    lignes = SortieDetailSerializer(
        many=True,
        read_only=True
    )

    centre_nom = serializers.SerializerMethodField()
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Sortie
        fields = [
            "sor_id",
            "sor_numero",
            "sor_date",
            "sor_demande",
            "sor_centre_responsabilite",
            "centre_nom",
            "sor_responsable",
            "responsable_nom",
            "sor_direction",
            "sor_appliquee",
            "lignes",
        ]

        read_only_fields = [
            "sor_id",
            "sor_numero",
            "sor_date",
            "sor_appliquee",
        ]

    def get_centre_nom(self, obj):
        return str(obj.sor_centre_responsabilite)

    def get_responsable_nom(self, obj):
        return str(obj.sor_responsable)


# ============================================================
# RETOUR DETAIL
# ============================================================

class RetourDetailSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="retd_article.art_designation",
        read_only=True
    )
    emplacement_code = serializers.CharField(source="retd_emplacement.emp_code", read_only=True)

    class Meta:
        model = RetourDetail
        fields = [
            "retd_id",
            "retd_retour",
            "retd_article",
            "retd_emplacement",
            "emplacement_code",
            "article_designation",
            "retd_quantite",
            "retd_etat_article",
        ]


# ============================================================
# RETOUR
# ============================================================

class RetourSerializer(serializers.ModelSerializer):

    lignes = RetourDetailSerializer(
        many=True,
        read_only=True
    )

    centre_nom = serializers.SerializerMethodField()
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Retour
        fields = [
            "ret_id",
            "ret_numero",
            "ret_date",
            "ret_centre_responsabilite",
            "centre_nom",
            "ret_responsable",
            "responsable_nom",
            "ret_appliquee",
            "lignes",
        ]

        read_only_fields = [
            "ret_id",
            "ret_numero",
            "ret_date",
            "ret_appliquee",
        ]

    def get_centre_nom(self, obj):
        return str(obj.ret_centre_responsabilite)

    def get_responsable_nom(self, obj):
        return str(obj.ret_responsable)


# ============================================================
# DOTATION DETAIL
# ============================================================

class DotationDirecteDetailSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="dotd_article.art_designation",
        read_only=True
    )
    emplacement_code = serializers.CharField(source="dotd_emplacement.emp_code", read_only=True)

    class Meta:
        model = DotationDirecteDetail
        fields = [
            "dotd_id",
            "dotd_dotation",
            "dotd_article",
            "dotd_emplacement",
            "emplacement_code",
            "article_designation",
            "dotd_quantite",
        ]


# ============================================================
# DOTATION
# ============================================================

class DotationDirecteSerializer(serializers.ModelSerializer):

    lignes = DotationDirecteDetailSerializer(
        many=True,
        read_only=True
    )

    centre_nom = serializers.SerializerMethodField()
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = DotationDirecte
        fields = [
            "dot_id",
            "dot_numero",
            "dot_date",
            "dot_centre_responsabilite",
            "centre_nom",
            "dot_responsable",
            "responsable_nom",
            "dot_justification",
            "dot_appliquee",
            "lignes",
        ]

        read_only_fields = [
            "dot_id",
            "dot_numero",
            "dot_date",
            "dot_appliquee",
        ]

    def get_centre_nom(self, obj):
        return str(obj.dot_centre_responsabilite)

    def get_responsable_nom(self, obj):
        return str(obj.dot_responsable)


# ============================================================
# LIGNE INVENTAIRE
# ============================================================

class LigneInventaireSerializer(serializers.ModelSerializer):

    article_designation = serializers.CharField(
        source="linv_article.art_designation",
        read_only=True
    )

    ecart = serializers.SerializerMethodField()
    emplacement_code = serializers.CharField(source="linv_emplacement.emp_code", read_only=True)
    article_code = serializers.CharField(source="linv_article.art_code_article", read_only=True)
    article_reference = serializers.CharField(source="linv_article.art_reference", read_only=True, allow_null=True)
    article_prix_unitaire = serializers.DecimalField(source="linv_prix_unitaire", max_digits=14, decimal_places=2, read_only=True)
    article_unite = serializers.CharField(source="linv_article.art_unite", read_only=True)
    article_test = serializers.BooleanField(source="linv_article.art_test", read_only=True)
    valeur_reelle = serializers.SerializerMethodField()

    class Meta:
        model = LigneInventaire
        fields = [
            "linv_id",
            "linv_inventaire",
            "linv_article",
            "article_code",
            "linv_emplacement",
            "emplacement_code",
            "article_designation",
            "article_reference",
            "article_prix_unitaire",
            "article_unite",
            "article_test",
            "linv_quantite_theorique",
            "linv_quantite_reelle",
            "linv_prix_unitaire",
            "ecart",
            "linv_valeur_theorique",
            "linv_valeur_ecart",
            "valeur_reelle",
            "linv_note",
        ]

        read_only_fields = [
            "linv_quantite_theorique",
            "linv_prix_unitaire",
            "linv_valeur_theorique",
            "linv_valeur_ecart",
            "linv_inventaire",
            "linv_article",
            "linv_emplacement",
        ]

    def get_ecart(self, obj):
        return obj.calculer_ecart()

    def get_valeur_reelle(self, obj):
        return obj.linv_quantite_reelle * obj.linv_prix_unitaire

    def validate_linv_quantite_reelle(self, value):
        if value < 0:
            raise serializers.ValidationError("La quantité réelle ne peut pas être négative.")
        return value


# ============================================================
# INVENTAIRE
# ============================================================

class InventaireSerializer(serializers.ModelSerializer):

    lignes = LigneInventaireSerializer(
        many=True,
        read_only=True
    )

    responsable_nom = serializers.SerializerMethodField()
    validateur_nom = serializers.SerializerMethodField()

    type_display = serializers.CharField(
        source="get_inv_type_display",
        read_only=True
    )

    statut_display = serializers.CharField(
        source="get_inv_statut_display",
        read_only=True
    )

    class Meta:
        model = Inventaire
        fields = [
            "inv_id",
            "inv_numero",
            "inv_type",
            "type_display",
            "inv_statut",
            "statut_display",
            "inv_date_debut",
            "inv_date_fin",
            "inv_responsable",
            "responsable_nom",
            "inv_validateur",
            "validateur_nom",
            "lignes",
        ]

        read_only_fields = [
            "inv_id",
            "inv_statut",
            "inv_date_fin",
        ]

    def get_responsable_nom(self, obj):
        return str(obj.inv_responsable)

    def get_validateur_nom(self, obj):
        return str(obj.inv_validateur) if obj.inv_validateur else None


# ============================================================
# JOURNAL AUDIT
# ============================================================

class JournalAuditSerializer(serializers.ModelSerializer):

    personnel_nom = serializers.SerializerMethodField()

    class Meta:
        model = JournalAudit
        fields = [
            "aud_id",
            "aud_personnel",
            "personnel_nom",
            "aud_action",
            "aud_details",
            "aud_date",
        ]

        read_only_fields = [
            "aud_id",
            "aud_date",
        ]

    def get_personnel_nom(self, obj):
        return str(obj.aud_personnel) if obj.aud_personnel else None
