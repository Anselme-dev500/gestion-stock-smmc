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


# ============================================================
# ARTICLE
# ============================================================

class ArticleSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        from core.models import StockConfiguration, default_stock_settings
        if self.instance is None and "art_seuil_min" not in attrs:
            configuration = StockConfiguration.objects.filter(pk=1).values_list("valeurs", flat=True).first() or default_stock_settings()
            attrs["art_seuil_min"] = configuration.get("seuil_defaut", 5)
        return super().validate(attrs)

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

    class Meta:
        model = Article
        fields = [
            "art_code_article",
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
            "art_etat",
            "art_created_at",
            "art_updated_at",
            "alerte_stock",
            "valeur_stock",
        ]

        read_only_fields = [
            "art_quantite_stock",
            "art_created_at",
            "art_updated_at",
        ]

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

    class Meta:
        model = EntreeDetail
        fields = [
            "entd_id",
            "entd_entree",
            "entd_article",
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

    class Meta:
        model = SortieDetail
        fields = [
            "sord_id",
            "sord_sortie",
            "sord_article",
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

    class Meta:
        model = RetourDetail
        fields = [
            "retd_id",
            "retd_retour",
            "retd_article",
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

    class Meta:
        model = DotationDirecteDetail
        fields = [
            "dotd_id",
            "dotd_dotation",
            "dotd_article",
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

    class Meta:
        model = LigneInventaire
        fields = [
            "linv_id",
            "linv_inventaire",
            "linv_article",
            "article_designation",
            "linv_quantite_theorique",
            "linv_quantite_reelle",
            "ecart",
            "linv_valeur_theorique",
            "linv_valeur_ecart",
            "linv_note",
        ]

        read_only_fields = [
            "linv_quantite_theorique",
            "linv_valeur_theorique",
            "linv_valeur_ecart",
        ]

    def get_ecart(self, obj):
        return obj.calculer_ecart()


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
