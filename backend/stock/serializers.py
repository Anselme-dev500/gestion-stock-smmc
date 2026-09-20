from rest_framework import serializers
from .models import (
    Categorie, Emplacement, Fournisseur, Article,
    Demande, LigneDemande, Validation, PieceJointe,
    Entree, EntreeDetail, Sortie, SortieDetail,
    Retour, RetourDetail, DotationDirecte, DotationDirecteDetail,
    Inventaire, LigneInventaire, JournalAudit,
    EtatArticle, TypeDemande, StatutDemande, NiveauValidation, StatutValidation
)
from personnel.models import Personnel
from cdg_centre_responsabilite.models import CentreResponsabilite
from core.models import StockProfil, RoleStock


# ============================================================
# Referentiels
# ============================================================

class CategorieSerializer(serializers.ModelSerializer):
    cat_parent_nom = serializers.CharField(source='cat_parent.cat_nom', read_only=True)
    nombre_articles = serializers.IntegerField(source='articles.count', read_only=True)

    class Meta:
        model = Categorie
        fields = ['cat_id', 'cat_nom', 'cat_parent', 'cat_parent_nom', 'nombre_articles']


class EmplacementSerializer(serializers.ModelSerializer):
    nombre_articles = serializers.IntegerField(source='articles.count', read_only=True)

    class Meta:
        model = Emplacement
        fields = ['emp_id', 'emp_code', 'emp_description', 'nombre_articles']


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ['frn_id', 'frn_code', 'frn_nom', 'frn_contact', 'frn_telephone', 'frn_email', 'frn_adresse']


class ArticleSerializer(serializers.ModelSerializer):
    cat_nom = serializers.CharField(source='art_categorie.cat_nom', read_only=True)
    emp_code = serializers.CharField(source='art_emplacement.emp_code', read_only=True, allow_null=True)
    est_en_alerte = serializers.BooleanField(source='est_en_alerte', read_only=True)

    class Meta:
        model = Article
        fields = [
            'art_code_article', 'art_designation', 'art_reference',
            'art_categorie', 'cat_nom',
            'art_emplacement', 'emp_code',
            'art_unite', 'art_prix_unitaire', 'art_quantite_stock',
            'art_seuil_min', 'art_seuil_max', 'art_etat',
            'est_en_alerte', 'art_created_at', 'art_updated_at'
        ]


# ============================================================
# Demandes & Circuit de validation
# ============================================================

class LigneDemandeSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='ldem_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='ldem_article.art_designation', read_only=True)
    art_unite = serializers.CharField(source='ldem_article.art_unite', read_only=True)
    art_stock_actuel = serializers.IntegerField(source='ldem_article.art_quantite_stock', read_only=True)

    class Meta:
        model = LigneDemande
        fields = [
            'ldem_id', 'ldem_demande', 'ldem_article', 'art_code',
            'art_designation', 'art_unite', 'art_stock_actuel',
            'ldem_quantite_demandee', 'ldem_quantite_accordee', 'ldem_remarque'
        ]
        extra_kwargs = {'ldem_demande': {'required': False}}


class ValidationSerializer(serializers.ModelSerializer):
    validateur_nom = serializers.SerializerMethodField()
    niveau_display = serializers.CharField(source='get_val_niveau_display', read_only=True)
    statut_display = serializers.CharField(source='get_val_statut_display', read_only=True)

    class Meta:
        model = Validation
        fields = [
            'val_id', 'val_demande', 'val_niveau', 'niveau_display',
            'val_statut', 'statut_display', 'val_validateur',
            'validateur_nom', 'val_date', 'val_commentaire'
        ]

    def get_validateur_nom(self, obj):
        if obj.val_validateur:
            return f"{obj.val_validateur.per_nom} {obj.val_validateur.per_prenom or ''}".strip()
        return "N/A"


class PieceJointeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PieceJointe
        fields = ['pj_id', 'pj_demande', 'pj_nom_fichier', 'pj_fichier', 'pj_ajoute_par', 'pj_date_ajout']


class DemandeDetailSerializer(serializers.ModelSerializer):
    lignes = LigneDemandeSerializer(many=True, read_only=True)
    validations = ValidationSerializer(many=True, read_only=True)
    pieces_jointes = PieceJointeSerializer(many=True, read_only=True)

    demandeur_nom = serializers.SerializerMethodField()
    service_nom = serializers.CharField(source='dem_centre_responsabilite.cr_nom', read_only=True)
    service_code = serializers.CharField(source='dem_centre_responsabilite.cr_code', read_only=True)
    type_display = serializers.CharField(source='get_dem_type_display', read_only=True)
    statut_display = serializers.CharField(source='get_dem_statut_display', read_only=True)

    class Meta:
        model = Demande
        fields = [
            'dem_id', 'dem_numero', 'dem_centre_responsabilite', 'service_nom', 'service_code',
            'dem_demandeur', 'demandeur_nom', 'dem_direction', 'dem_date',
            'dem_type', 'type_display', 'dem_motif', 'dem_statut', 'statut_display',
            'lignes', 'validations', 'pieces_jointes'
        ]

    def get_demandeur_nom(self, obj):
        if obj.dem_demandeur:
            return f"{obj.dem_demandeur.per_nom} {obj.dem_demandeur.per_prenom or ''}".strip()
        return "N/A"


class DemandeCreateUpdateSerializer(serializers.ModelSerializer):
    lignes = LigneDemandeSerializer(many=True)

    class Meta:
        model = Demande
        fields = [
            'dem_id', 'dem_numero', 'dem_centre_responsabilite', 'dem_demandeur',
            'dem_direction', 'dem_type', 'dem_motif', 'dem_statut', 'lignes'
        ]
        extra_kwargs = {
            'dem_numero': {'required': False},
            'dem_demandeur': {'required': False},
            'dem_statut': {'required': False}
        }

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        
        # Generer numéro si non fourni
        if not validated_data.get('dem_numero'):
            from django.utils import timezone
            import random
            today_str = timezone.now().strftime("%Y%m%d")
            rand_suffix = random.randint(100, 999)
            validated_data['dem_numero'] = f"DEM-{today_str}-{rand_suffix}"

        demande = Demande.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneDemande.objects.create(
                ldem_demande=demande,
                ldem_article=ligne_data['ldem_article'],
                ldem_quantite_demandee=ligne_data['ldem_quantite_demandee'],
                ldem_remarque=ligne_data.get('ldem_remarque', '')
            )
        return demande


# ============================================================
# Mouvements
# ============================================================

class EntreeDetailSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='entd_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='entd_article.art_designation', read_only=True)
    montant_total = serializers.DecimalField(source='calculer_montant', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = EntreeDetail
        fields = ['entd_id', 'entd_entree', 'entd_article', 'art_code', 'art_designation', 'entd_quantite', 'entd_prix_unitaire', 'montant_total']
        extra_kwargs = {'entd_entree': {'required': False}}


class EntreeSerializer(serializers.ModelSerializer):
    lignes = EntreeDetailSerializer(many=True)
    fournisseur_nom = serializers.CharField(source='ent_fournisseur.frn_nom', read_only=True, allow_null=True)
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Entree
        fields = ['ent_id', 'ent_numero', 'ent_date', 'ent_fournisseur', 'fournisseur_nom', 'ent_responsable', 'responsable_nom', 'ent_bl_reference', 'ent_direction', 'lignes']
        extra_kwargs = {'ent_numero': {'required': False}, 'ent_responsable': {'required': False}}

    def get_responsable_nom(self, obj):
        if obj.ent_responsable:
            return f"{obj.ent_responsable.per_nom} {obj.ent_responsable.per_prenom or ''}".strip()
        return "N/A"

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        if not validated_data.get('ent_numero'):
            from django.utils import timezone
            import random
            today_str = timezone.now().strftime("%Y%m%d")
            validated_data['ent_numero'] = f"ENT-{today_str}-{random.randint(100, 999)}"

        entree = Entree.objects.create(**validated_data)
        for ligne in lignes_data:
            article = ligne['entd_article']
            quantite = ligne['entd_quantite']
            prix_unitaire = ligne['entd_prix_unitaire']

            EntreeDetail.objects.create(
                entd_entree=entree,
                entd_article=article,
                entd_quantite=quantite,
                entd_prix_unitaire=prix_unitaire
            )
            # Mise à jour du stock
            article.art_quantite_stock += quantite
            article.art_prix_unitaire = prix_unitaire
            article.save()

        return entree


class SortieDetailSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='sord_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='sord_article.art_designation', read_only=True)

    class Meta:
        model = SortieDetail
        fields = ['sord_id', 'sord_sortie', 'sord_article', 'art_code', 'art_designation', 'sord_quantite']
        extra_kwargs = {'sord_sortie': {'required': False}}


class SortieSerializer(serializers.ModelSerializer):
    lignes = SortieDetailSerializer(many=True)
    service_nom = serializers.CharField(source='sor_centre_responsabilite.cr_nom', read_only=True)
    demande_numero = serializers.CharField(source='sor_demande.dem_numero', read_only=True, allow_null=True)
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Sortie
        fields = ['sor_id', 'sor_numero', 'sor_date', 'sor_demande', 'demande_numero', 'sor_centre_responsabilite', 'service_nom', 'sor_responsable', 'responsable_nom', 'sor_direction', 'lignes']
        extra_kwargs = {'sor_numero': {'required': False}, 'sor_responsable': {'required': False}}

    def get_responsable_nom(self, obj):
        if obj.sor_responsable:
            return f"{obj.sor_responsable.per_nom} {obj.sor_responsable.per_prenom or ''}".strip()
        return "N/A"

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        if not validated_data.get('sor_numero'):
            from django.utils import timezone
            import random
            today_str = timezone.now().strftime("%Y%m%d")
            validated_data['sor_numero'] = f"SOR-{today_str}-{random.randint(100, 999)}"

        sortie = Sortie.objects.create(**validated_data)
        for ligne in lignes_data:
            article = ligne['sord_article']
            quantite = ligne['sord_quantite']

            SortieDetail.objects.create(
                sord_sortie=sortie,
                sord_article=article,
                sord_quantite=quantite
            )
            # Décrémentation du stock
            article.art_quantite_stock = max(0, article.art_quantite_stock - quantite)
            article.save()

        return sortie


class RetourDetailSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='retd_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='retd_article.art_designation', read_only=True)

    class Meta:
        model = RetourDetail
        fields = ['retd_id', 'retd_retour', 'retd_article', 'art_code', 'art_designation', 'retd_quantite', 'retd_etat_article']
        extra_kwargs = {'retd_retour': {'required': False}}


class RetourSerializer(serializers.ModelSerializer):
    lignes = RetourDetailSerializer(many=True)
    service_nom = serializers.CharField(source='ret_centre_responsabilite.cr_nom', read_only=True)

    class Meta:
        model = Retour
        fields = ['ret_id', 'ret_numero', 'ret_date', 'ret_centre_responsabilite', 'service_nom', 'ret_responsable', 'lignes']
        extra_kwargs = {'ret_numero': {'required': False}, 'ret_responsable': {'required': False}}

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        if not validated_data.get('ret_numero'):
            from django.utils import timezone
            import random
            validated_data['ret_numero'] = f"RET-{timezone.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"

        retour = Retour.objects.create(**validated_data)
        for ligne in lignes_data:
            article = ligne['retd_article']
            quantite = ligne['retd_quantite']

            RetourDetail.objects.create(
                retd_retour=retour,
                retd_article=article,
                retd_quantite=quantite,
                retd_etat_article=ligne.get('retd_etat_article', '')
            )
            # Réintégration si l'article est réutilisable
            if ligne.get('retd_etat_article', '').lower() != 'défectueux':
                article.art_quantite_stock += quantite
                article.save()

        return retour


class DotationDirecteDetailSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='dotd_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='dotd_article.art_designation', read_only=True)

    class Meta:
        model = DotationDirecteDetail
        fields = ['dotd_id', 'dotd_dotation', 'dotd_article', 'art_code', 'art_designation', 'dotd_quantite']
        extra_kwargs = {'dotd_dotation': {'required': False}}


class DotationDirecteSerializer(serializers.ModelSerializer):
    lignes = DotationDirecteDetailSerializer(many=True)
    service_nom = serializers.CharField(source='dot_centre_responsabilite.cr_nom', read_only=True)

    class Meta:
        model = DotationDirecte
        fields = ['dot_id', 'dot_numero', 'dot_date', 'dot_centre_responsabilite', 'service_nom', 'dot_responsable', 'dot_justification', 'lignes']
        extra_kwargs = {'dot_numero': {'required': False}, 'dot_responsable': {'required': False}}

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        if not validated_data.get('dot_numero'):
            from django.utils import timezone
            import random
            validated_data['dot_numero'] = f"DOT-{timezone.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"

        dotation = DotationDirecte.objects.create(**validated_data)
        for ligne in lignes_data:
            article = ligne['dotd_article']
            quantite = ligne['dotd_quantite']

            DotationDirecteDetail.objects.create(
                dotd_dotation=dotation,
                dotd_article=article,
                dotd_quantite=quantite
            )
            article.art_quantite_stock = max(0, article.art_quantite_stock - quantite)
            article.save()

        return dotation


# ============================================================
# Inventaire
# ============================================================

class LigneInventaireSerializer(serializers.ModelSerializer):
    art_code = serializers.CharField(source='linv_article.art_code_article', read_only=True)
    art_designation = serializers.CharField(source='linv_article.art_designation', read_only=True)
    ecart = serializers.IntegerField(source='calculer_ecart', read_only=True)

    class Meta:
        model = LigneInventaire
        fields = [
            'linv_id', 'linv_inventaire', 'linv_article', 'art_code', 'art_designation',
            'linv_quantite_theorique', 'linv_quantite_reelle', 'ecart',
            'linv_valeur_theorique', 'linv_valeur_ecart', 'linv_note'
        ]
        extra_kwargs = {'linv_inventaire': {'required': False}}


class InventaireSerializer(serializers.ModelSerializer):
    lignes = LigneInventaireSerializer(many=True, read_only=True)
    responsable_nom = serializers.SerializerMethodField()
    validateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Inventaire
        fields = [
            'inv_id', 'inv_numero', 'inv_type', 'inv_statut',
            'inv_date_debut', 'inv_date_fin', 'inv_responsable', 'responsable_nom',
            'inv_validateur', 'validateur_nom', 'lignes'
        ]

    def get_responsable_nom(self, obj):
        if obj.inv_responsable:
            return f"{obj.inv_responsable.per_nom} {obj.inv_responsable.per_prenom or ''}".strip()
        return "N/A"

    def get_validateur_nom(self, obj):
        if obj.inv_validateur:
            return f"{obj.inv_validateur.per_nom} {obj.inv_validateur.per_prenom or ''}".strip()
        return "N/A"


# ============================================================
# Journal d'audit
# ============================================================

class JournalAuditSerializer(serializers.ModelSerializer):
    personnel_nom = serializers.SerializerMethodField()

    class Meta:
        model = JournalAudit
        fields = ['aud_id', 'aud_personnel', 'personnel_nom', 'aud_action', 'aud_details', 'aud_date']

    def get_personnel_nom(self, obj):
        if obj.aud_personnel:
            return f"{obj.aud_personnel.per_nom} {obj.aud_personnel.per_prenom or ''}".strip()
        return "Système"
