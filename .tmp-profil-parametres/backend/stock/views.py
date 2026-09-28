from .permissions import StockModulePermission
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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

    StatutValidation,
)

from .serializers import (
    CategorieSerializer,
    EmplacementSerializer,
    FournisseurSerializer,
    ArticleSerializer,

    DemandeSerializer,
    LigneDemandeSerializer,
    ValidationSerializer,
    PieceJointeSerializer,

    EntreeSerializer,
    EntreeDetailSerializer,

    SortieSerializer,
    SortieDetailSerializer,

    RetourSerializer,
    RetourDetailSerializer,

    DotationDirecteSerializer,
    DotationDirecteDetailSerializer,

    InventaireSerializer,
    LigneInventaireSerializer,

    JournalAuditSerializer,
)


# ============================================================
# CATEGORIES
# ============================================================

class CategorieViewSet(viewsets.ModelViewSet):

    queryset = Categorie.objects.all().select_related("cat_parent")
    serializer_class = CategorieSerializer
    permission_classes = [StockModulePermission]

    search_fields = ["cat_nom"]
    ordering_fields = ["cat_nom"]

    @action(detail=True, methods=["get"])
    def articles(self, request, pk=None):

        categorie = self.get_object()

        inclure_sous_categories = request.query_params.get(
            "inclure_sous_categories",
            "true"
        ).lower() == "true"

        articles = categorie.lister_articles(
            inclure_sous_categories=inclure_sous_categories
        )

        serializer = ArticleSerializer(
            articles,
            many=True
        )

        return Response(serializer.data)


# ============================================================
# EMPLACEMENTS
# ============================================================

class EmplacementViewSet(viewsets.ModelViewSet):

    queryset = Emplacement.objects.all()
    serializer_class = EmplacementSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "emp_code",
        "emp_description",
    ]


# ============================================================
# FOURNISSEURS
# ============================================================

class FournisseurViewSet(viewsets.ModelViewSet):

    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "frn_code",
        "frn_nom",
        "frn_contact",
        "frn_telephone",
        "frn_email",
    ]

    @action(detail=True, methods=["get"])
    def livraisons(self, request, pk=None):

        fournisseur = self.get_object()

        entrees = fournisseur.historique_livraisons()

        serializer = EntreeSerializer(
            entrees,
            many=True
        )

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def articles(self, request, pk=None):

        fournisseur = self.get_object()

        articles = fournisseur.lister_articles_fournis()

        serializer = ArticleSerializer(
            articles,
            many=True
        )

        return Response(serializer.data)


# ============================================================
# ARTICLES
# ============================================================

class ArticleViewSet(viewsets.ModelViewSet):

    queryset = Article.objects.all().select_related(
        "art_categorie",
        "art_emplacement",
    )

    serializer_class = ArticleSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "art_code_article",
        "art_designation",
        "art_reference",
    ]

    ordering_fields = [
        "art_designation",
        "art_quantite_stock",
        "art_prix_unitaire",
        "art_created_at",
    ]

    @action(detail=False, methods=["get"])
    def alertes(self, request):

        articles = [
            article
            for article in self.get_queryset()
            if article.est_en_alerte()
        ]

        serializer = self.get_serializer(
            articles,
            many=True
        )

        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def valeur_stock(self, request):

        total = sum(
            article.calculer_valeur_stock()
            for article in self.get_queryset()
        )

        return Response({
            "valeur_totale": total
        })


# ============================================================
# DEMANDES
# ============================================================

class DemandeViewSet(viewsets.ModelViewSet):

    queryset = Demande.objects.all().select_related(
        "dem_centre_responsabilite",
        "dem_demandeur",
    ).prefetch_related(
        "lignes",
        "validations",
        "pieces_jointes",
    )

    serializer_class = DemandeSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "dem_numero",
        "dem_motif",
    ]

    ordering_fields = [
        "dem_date",
        "dem_numero",
        "dem_statut",
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        person = getattr(self.request.user, 'user_personnel', None)
        if self.request.user.is_superuser or not person:
            return qs
        role = getattr(getattr(person, 'stock_profil', None), 'pst_role', None)
        if role == 'chef_departement':
            from .chef_api import scope
            return qs.filter(pk__in=scope(person).values('pk'))
        if role == 'chef_service':
            return qs.filter(dem_demandeur=person)
        return qs

    @action(detail=True, methods=["post"])
    def soumettre(self, request, pk=None):

        demande = self.get_object()

        try:
            demande.soumettre()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(demande).data
        )

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):

        demande = self.get_object()

        motif = request.data.get(
            "motif",
            ""
        )

        try:
            demande.annuler(motif)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(demande).data
        )

    @action(detail=True, methods=["get"])
    def validations(self, request, pk=None):

        demande = self.get_object()

        validations = demande.validations.all()

        serializer = ValidationSerializer(
            validations,
            many=True
        )

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def lignes(self, request, pk=None):

        demande = self.get_object()

        lignes = demande.lignes.all()

        serializer = LigneDemandeSerializer(
            lignes,
            many=True
        )

        return Response(serializer.data)


# ============================================================
# LIGNES DEMANDES
# ============================================================

class LigneDemandeViewSet(viewsets.ModelViewSet):

    queryset = LigneDemande.objects.all().select_related(
        "ldem_demande",
        "ldem_article",
    )

    serializer_class = LigneDemandeSerializer
    permission_classes = [StockModulePermission]

    @action(detail=True, methods=["post"])
    def accorder(self, request, pk=None):

        ligne = self.get_object()

        quantite = request.data.get(
            "quantite"
        )

        if quantite is None:
            return Response(
                {"detail": "La quantité est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantite = int(quantite)
            ligne.accorder_quantite(quantite)

        except (ValueError, TypeError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(ligne).data
        )


# ============================================================
# VALIDATIONS
# ============================================================

class ValidationViewSet(viewsets.ModelViewSet):

    queryset = Validation.objects.all().select_related(
        "val_demande",
        "val_validateur",
    )

    serializer_class = ValidationSerializer
    permission_classes = [StockModulePermission]

    @transaction.atomic
    def create(self, request, *args, **kwargs):

        demande_id = request.data.get(
            "val_demande"
        )

        niveau = request.data.get(
            "val_niveau"
        )

        statut = request.data.get(
            "val_statut"
        )

        commentaire = request.data.get(
            "val_commentaire",
            ""
        )

        demande = get_object_or_404(
            Demande,
            pk=demande_id
        )

        validateur_id = request.data.get(
            "val_validateur"
        )

        if not validateur_id:
            return Response(
                {"detail": "Le validateur est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from personnel.models import Personnel

        validateur = get_object_or_404(
            Personnel,
            pk=validateur_id
        )

        try:

            validation = Validation.enregistrer(
                demande=demande,
                niveau=niveau,
                validateur=validateur,
                statut=statut,
                commentaire=commentaire,
            )

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(
            validation
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


# ============================================================
# PIECES JOINTES
# ============================================================

class PieceJointeViewSet(viewsets.ModelViewSet):

    queryset = PieceJointe.objects.all().select_related(
        "pj_demande",
        "pj_ajoute_par",
    )

    serializer_class = PieceJointeSerializer
    permission_classes = [StockModulePermission]


# ============================================================
# ENTREES
# ============================================================

class EntreeViewSet(viewsets.ModelViewSet):

    queryset = Entree.objects.all().select_related(
        "ent_fournisseur",
        "ent_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = EntreeSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "ent_numero",
        "ent_bl_reference",
    ]

    ordering_fields = [
        "ent_date",
        "ent_numero",
    ]

    @action(detail=True, methods=["post"])
    def enregistrer(self, request, pk=None):

        entree = self.get_object()

        try:
            entree.enregistrer()

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(entree).data
        )

    @action(detail=True, methods=["get"])
    def lignes(self, request, pk=None):

        entree = self.get_object()

        serializer = EntreeDetailSerializer(
            entree.lignes.all(),
            many=True
        )

        return Response(serializer.data)


# ============================================================
# DETAILS ENTREES
# ============================================================

class EntreeDetailViewSet(viewsets.ModelViewSet):

    queryset = EntreeDetail.objects.all().select_related(
        "entd_entree",
        "entd_article",
    )

    serializer_class = EntreeDetailSerializer
    permission_classes = [StockModulePermission]


# ============================================================
# SORTIES
# ============================================================

class SortieViewSet(viewsets.ModelViewSet):

    queryset = Sortie.objects.all().select_related(
        "sor_demande",
        "sor_centre_responsabilite",
        "sor_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = SortieSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "sor_numero",
    ]

    ordering_fields = [
        "sor_date",
        "sor_numero",
    ]

    @action(
        detail=False,
        methods=["post"],
        url_path="depuis-demande/(?P<demande_id>[^/.]+)"
    )
    def depuis_demande(self, request, demande_id=None):

        demande = get_object_or_404(
            Demande,
            pk=demande_id
        )

        responsable_id = request.data.get(
            "responsable"
        )

        if not responsable_id:
            return Response(
                {"detail": "Le responsable est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from personnel.models import Personnel

        responsable = get_object_or_404(
            Personnel,
            pk=responsable_id
        )

        try:

            sortie = Sortie.generer_depuis_demande(
                demande,
                responsable
            )

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(sortie).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def enregistrer(self, request, pk=None):

        sortie = self.get_object()

        try:
            sortie.enregistrer()

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(sortie).data
        )


# ============================================================
# DETAILS SORTIES
# ============================================================

class SortieDetailViewSet(viewsets.ModelViewSet):

    queryset = SortieDetail.objects.all().select_related(
        "sord_sortie",
        "sord_article",
    )

    serializer_class = SortieDetailSerializer
    permission_classes = [StockModulePermission]


# ============================================================
# RETOURS
# ============================================================

class RetourViewSet(viewsets.ModelViewSet):

    queryset = Retour.objects.all().select_related(
        "ret_centre_responsabilite",
        "ret_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = RetourSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "ret_numero",
    ]

    @action(detail=True, methods=["post"])
    def enregistrer(self, request, pk=None):

        retour = self.get_object()

        try:
            retour.enregistrer()

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(retour).data
        )


# ============================================================
# DETAILS RETOURS
# ============================================================

class RetourDetailViewSet(viewsets.ModelViewSet):

    queryset = RetourDetail.objects.all().select_related(
        "retd_retour",
        "retd_article",
    )

    serializer_class = RetourDetailSerializer
    permission_classes = [StockModulePermission]


# ============================================================
# DOTATIONS
# ============================================================

class DotationDirecteViewSet(viewsets.ModelViewSet):

    queryset = DotationDirecte.objects.all().select_related(
        "dot_centre_responsabilite",
        "dot_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = DotationDirecteSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "dot_numero",
        "dot_justification",
    ]

    @action(detail=True, methods=["post"])
    def enregistrer(self, request, pk=None):

        dotation = self.get_object()

        try:
            dotation.enregistrer()

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(dotation).data
        )


# ============================================================
# DETAILS DOTATIONS
# ============================================================

class DotationDirecteDetailViewSet(viewsets.ModelViewSet):

    queryset = DotationDirecteDetail.objects.all().select_related(
        "dotd_dotation",
        "dotd_article",
    )

    serializer_class = DotationDirecteDetailSerializer
    permission_classes = [StockModulePermission]


# ============================================================
# INVENTAIRES
# ============================================================

class InventaireViewSet(viewsets.ModelViewSet):

    queryset = Inventaire.objects.all().select_related(
        "inv_responsable",
        "inv_validateur",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = InventaireSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "inv_numero",
    ]

    ordering_fields = [
        "inv_numero",
        "inv_date_debut",
        "inv_date_fin",
    ]

    @action(detail=True, methods=["post"])
    def cloturer(self, request, pk=None):

        inventaire = self.get_object()

        validateur_id = request.data.get(
            "validateur"
        )

        validateur = None

        if validateur_id:

            from personnel.models import Personnel

            validateur = get_object_or_404(
                Personnel,
                pk=validateur_id
            )

        try:

            inventaire.cloturer(
                validateur=validateur
            )

        except ValueError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            self.get_serializer(inventaire).data
        )

    @action(detail=True, methods=["post"])
    def recalculer_ecarts(self, request, pk=None):

        inventaire = self.get_object()

        inventaire.calculer_ecarts()

        return Response(
            self.get_serializer(inventaire).data
        )


# ============================================================
# DETAILS INVENTAIRE
# ============================================================

class LigneInventaireViewSet(viewsets.ModelViewSet):

    queryset = LigneInventaire.objects.all().select_related(
        "linv_inventaire",
        "linv_article",
    )

    serializer_class = LigneInventaireSerializer
    permission_classes = [StockModulePermission]

    @action(detail=True, methods=["post"])
    def recalculer(self, request, pk=None):

        ligne = self.get_object()

        valeur = ligne.calculer_valeur_ecart()

        return Response({
            "ecart": ligne.calculer_ecart(),
            "valeur_ecart": valeur,
        })


# ============================================================
# JOURNAL AUDIT
# ============================================================

class JournalAuditViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = JournalAudit.objects.all().select_related(
        "aud_personnel"
    ).order_by("-aud_date")

    serializer_class = JournalAuditSerializer
    permission_classes = [StockModulePermission]

    search_fields = [
        "aud_action",
        "aud_details",
    ]

    ordering_fields = [
        "aud_date",
        "aud_action",
    ]