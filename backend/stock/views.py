import re
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from cdg_centre_responsabilite.models import CentreResponsabilite

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
    NiveauValidation,
    StatutDemande,
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


# The React application consumes collection endpoints as plain JSON arrays.
# Keep that public API contract for every stock resource even though the
# project enables pagination globally for other Django REST Framework APIs.
class StockModelViewSet(viewsets.ModelViewSet):
    pagination_class = None


class StockReadOnlyModelViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = None


class NotificationsView(APIView):
    """Notifications calculées depuis les données réelles, sans données fictives."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        results = []
        for article in Article.objects.filter(art_etat="actif"):
            if article.est_en_alerte():
                results.append({
                    "id": f"stock-{article.art_code_article}", "type": "warning",
                    "title": "Stock faible", "message": f"{article.art_designation} est sous son seuil minimum.",
                    "created_at": timezone.now().isoformat(), "link": "/etat-stock",
                })
        for inventaire in Inventaire.objects.filter(inv_statut="en_cours").order_by("inv_date_debut")[:5]:
            results.append({
                "id": f"inv-{inventaire.inv_id}", "type": "info",
                "title": "Inventaire en cours", "message": f"{inventaire.inv_numero} attend son comptage ou sa clôture.",
                "created_at": timezone.now().isoformat(), "link": "/inventaire",
            })
        return Response({"count": len(results), "results": results})


class MouvementConsolideView(APIView):
    """Read-only ledger assembled from the four header/detail movement models."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        types = set(filter(None, request.query_params.get("types", "entree,sortie,retour,dotation").split(",")))
        article_id = request.query_params.get("article")
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        service = (request.query_params.get("service") or "").strip().lower()
        mouvements = []

        def include(date, article, direction):
            if article_id and article.pk != article_id:
                return False
            date_value = date.date().isoformat()
            if date_debut and date_value < date_debut:
                return False
            if date_fin and date_value > date_fin:
                return False
            return not service or service in (direction or "").lower()

        def add(type_mouvement, ligne, entete, article, quantite, date, numero, responsable, direction, appliquee, detail_id, reintegre=True):
            if type_mouvement not in types or not include(date, article, direction):
                return
            signed = quantite if type_mouvement in ("entree", "retour") and reintegre else -quantite if type_mouvement in ("sortie", "dotation") else 0
            emplacement = next((getattr(ligne, attr) for attr in ("entd_emplacement", "sord_emplacement", "retd_emplacement", "dotd_emplacement") if hasattr(ligne, attr)), None)
            hierarchy = []
            current = article.art_categorie
            while current:
                hierarchy.append(current.cat_nom)
                current = current.cat_parent
            hierarchy.reverse()
            categorie, famille, sous_famille = (hierarchy + ["", "", ""])[:3]
            prix = getattr(ligne, "entd_prix_unitaire", article.art_prix_unitaire)
            mouvements.append({
                "id": f"{type_mouvement}-{detail_id}", "date": date, "type": type_mouvement,
                "article": {"code": article.art_code_article, "designation": article.art_designation, "unite": article.art_unite},
                "quantite": quantite, "quantite_signee": signed, "reference": numero,
                "responsable": str(responsable), "service_direction": direction or "—",
                "appliquee": appliquee, "reintegre_stock": reintegre,
                "code_article": article.art_code_article, "categorie": categorie, "famille": famille, "sous_famille": sous_famille,
                "designation": article.art_designation, "reference_article": article.art_reference,
                "type_mvt": type_mouvement, "date_mvt": date, "utilisateur": str(responsable), "unite": article.art_unite,
                "emplacement": emplacement.emp_code if emplacement else "NON-AFFECTE", "pu": prix, "valeur": quantite * prix,
                "document": getattr(entete, "ent_bl_reference", None) or numero,
                "fournisseur": str(getattr(entete, "ent_fournisseur", None) or "") or None,
                "observation_emplacement": (emplacement.emp_description if emplacement else "") or "",
            })

        if "entree" in types:
            for ligne in EntreeDetail.objects.select_related("entd_article", "entd_entree__ent_responsable"):
                e = ligne.entd_entree; add("entree", ligne, e, ligne.entd_article, ligne.entd_quantite, e.ent_date, e.ent_numero, e.ent_responsable, e.ent_direction, e.ent_appliquee, ligne.entd_id)
        if "sortie" in types:
            for ligne in SortieDetail.objects.select_related("sord_article", "sord_sortie__sor_responsable"):
                s = ligne.sord_sortie; add("sortie", ligne, s, ligne.sord_article, ligne.sord_quantite, s.sor_date, s.sor_numero, s.sor_responsable, s.sor_direction, s.sor_appliquee, ligne.sord_id)
        if "retour" in types:
            for ligne in RetourDetail.objects.select_related("retd_article", "retd_retour__ret_responsable"):
                r = ligne.retd_retour; reintegre = (ligne.retd_etat_article or "").strip().lower() != "défectueux"; add("retour", ligne, r, ligne.retd_article, ligne.retd_quantite, r.ret_date, r.ret_numero, r.ret_responsable, str(r.ret_centre_responsabilite), r.ret_appliquee, ligne.retd_id, reintegre)
        if "dotation" in types:
            for ligne in DotationDirecteDetail.objects.select_related("dotd_article", "dotd_dotation__dot_responsable"):
                d = ligne.dotd_dotation; add("dotation", ligne, d, ligne.dotd_article, ligne.dotd_quantite, d.dot_date, d.dot_numero, d.dot_responsable, str(d.dot_centre_responsabilite), d.dot_appliquee, ligne.dotd_id)
        mouvements.sort(key=lambda item: item["date"], reverse=True)
        return Response(mouvements)


class RapportStockView(APIView):
    """Period-based read-only report, built from the operational stock tables."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        debut = request.query_params.get("date_debut")
        fin = request.query_params.get("date_fin")
        statut = request.query_params.get("statut_demande")
        service = (request.query_params.get("service") or "").lower()
        mouvements = []
        sources = [
            (EntreeDetail.objects.select_related("entd_entree"), "entree", "entd_entree", "ent_date", "entd_quantite"),
            (SortieDetail.objects.select_related("sord_sortie"), "sortie", "sord_sortie", "sor_date", "sord_quantite"),
            (RetourDetail.objects.select_related("retd_retour"), "retour", "retd_retour", "ret_date", "retd_quantite"),
            (DotationDirecteDetail.objects.select_related("dotd_dotation"), "dotation", "dotd_dotation", "dot_date", "dotd_quantite"),
        ]
        for queryset, type_mouvement, header_attr, date_attr, quantity_attr in sources:
            for line in queryset:
                header = getattr(line, header_attr); date = getattr(header, date_attr)
                day = date.date().isoformat()
                if (debut and day < debut) or (fin and day > fin): continue
                mouvements.append((type_mouvement, getattr(line, quantity_attr)))
        par_type = {key: {"quantite": 0, "lignes": 0} for key in ("entree", "sortie", "retour", "dotation")}
        for type_mouvement, quantite in mouvements:
            par_type[type_mouvement]["quantite"] += quantite; par_type[type_mouvement]["lignes"] += 1
        demandes = Demande.objects.select_related("dem_centre_responsabilite")
        if debut: demandes = demandes.filter(dem_date__date__gte=debut)
        if fin: demandes = demandes.filter(dem_date__date__lte=fin)
        if statut: demandes = demandes.filter(dem_statut=statut)
        if service: demandes = [d for d in demandes if service in str(d.dem_centre_responsabilite).lower()]
        else: demandes = list(demandes)
        demandes_statut = {}
        for demande in demandes: demandes_statut[demande.dem_statut] = demandes_statut.get(demande.dem_statut, 0) + 1
        articles = Article.objects.select_related("art_categorie").all()
        alertes = [{"code": a.art_code_article, "designation": a.art_designation, "stock": a.art_quantite_stock, "seuil": a.art_seuil_min, "categorie": a.art_categorie.cat_nom} for a in articles if a.est_en_alerte()]
        valeur = sum(a.calculer_valeur_stock() for a in articles)
        return Response({"periode": {"date_debut": debut, "date_fin": fin}, "valeur_stock_actuelle": valeur, "articles_total": len(articles), "articles_alerte": alertes, "mouvements_par_type": par_type, "demandes_par_statut": demandes_statut, "demandes_total": len(demandes)})


class CentreResponsabiliteListView(APIView):
    """Minimal reference endpoint used by movement forms."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([
            {"cr_id": str(item.cr_id), "cr_code": item.cr_code, "cr_nom": item.cr_nom}
            for item in CentreResponsabilite.objects.filter(cr_actif=True).order_by("cr_code")
        ])


# ============================================================
# CATEGORIES
# ============================================================

class CategorieViewSet(StockModelViewSet):

    queryset = Categorie.objects.all().select_related("cat_parent")
    serializer_class = CategorieSerializer
    permission_classes = [IsAuthenticated]

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

class EmplacementViewSet(StockModelViewSet):

    queryset = Emplacement.objects.all()
    serializer_class = EmplacementSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "emp_code",
        "emp_description",
    ]


# ============================================================
# FOURNISSEURS
# ============================================================

class FournisseurViewSet(StockModelViewSet):

    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = [IsAuthenticated]

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

class ArticleViewSet(StockModelViewSet):

    queryset = Article.objects.all().select_related(
        "art_categorie",
        "art_emplacement",
    )

    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticated]

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

    def perform_destroy(self, instance):
        """Préserve la traçabilité : seuls les articles sans historique sont supprimables."""
        history_relations = (
            instance.lignes_demande, instance.lignes_entree, instance.lignes_sortie,
            instance.lignes_retour, instance.lignes_dotation, instance.lignes_inventaire,
        )
        if any(relation.exists() for relation in history_relations):
            raise ValidationError({"detail": "Cet article possède déjà un historique. Désactivez-le plutôt que de le supprimer."})
        stocks = instance.stocks_emplacements.all()
        if any(stock.ste_quantite != 0 for stock in stocks):
            raise ValidationError({"detail": "Cet article possède encore du stock. Enregistrez une sortie ou désactivez-le."})
        with transaction.atomic():
            stocks.delete()
            instance.delete()

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

class DemandeViewSet(StockModelViewSet):

    queryset = Demande.objects.all().select_related(
        "dem_centre_responsabilite",
        "dem_demandeur",
    ).prefetch_related(
        "lignes",
        "validations",
        "pieces_jointes",
    )

    serializer_class = DemandeSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "dem_numero",
        "dem_motif",
    ]

    ordering_fields = [
        "dem_date",
        "dem_numero",
        "dem_statut",
    ]

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

class LigneDemandeViewSet(StockModelViewSet):

    queryset = LigneDemande.objects.all().select_related(
        "ldem_demande",
        "ldem_article",
    )

    serializer_class = LigneDemandeSerializer
    permission_classes = [IsAuthenticated]

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

class ValidationViewSet(StockModelViewSet):

    queryset = Validation.objects.all().select_related(
        "val_demande",
        "val_validateur",
    )

    serializer_class = ValidationSerializer
    permission_classes = [IsAuthenticated]

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

class PieceJointeViewSet(StockModelViewSet):

    queryset = PieceJointe.objects.all().select_related(
        "pj_demande",
        "pj_ajoute_par",
    )

    serializer_class = PieceJointeSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# ENTREES
# ============================================================

class EntreeViewSet(StockModelViewSet):

    queryset = Entree.objects.all().select_related(
        "ent_fournisseur",
        "ent_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = EntreeSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "ent_numero",
        "ent_bl_reference",
    ]

    ordering_fields = [
        "ent_date",
        "ent_numero",
    ]

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def traiter_stock(self, request, pk=None):
        """Stock-manager step: agree quantities then record the validation."""
        demande = self.get_object()
        responsable = getattr(request.user, "user_personnel", None)
        if responsable is None:
            return Response({"detail": "Le compte connecté doit être lié à un personnel."}, status=status.HTTP_400_BAD_REQUEST)
        if demande.dem_statut in (StatutDemande.LIVREE, StatutDemande.REFUSEE):
            return Response({"detail": "Cette demande ne peut plus être traitée."}, status=status.HTTP_400_BAD_REQUEST)
        lignes = request.data.get("lignes", [])
        for ligne_data in lignes:
            ligne = get_object_or_404(LigneDemande, pk=ligne_data.get("ldem_id"), ldem_demande=demande)
            try:
                ligne.accorder_quantite(int(ligne_data.get("quantite_accordee")))
            except (TypeError, ValueError) as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        decision = request.data.get("decision", StatutValidation.VALIDEE)
        if decision not in (StatutValidation.VALIDEE, StatutValidation.REFUSEE):
            return Response({"detail": "Décision invalide."}, status=status.HTTP_400_BAD_REQUEST)
        Validation.enregistrer(demande, NiveauValidation.RESPONSABLE_STOCK, responsable, decision, request.data.get("commentaire", ""))
        return Response(self.get_serializer(demande).data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Creates a receipt header and all its lines without applying stock yet."""
        responsable = getattr(request.user, "user_personnel", None)
        if responsable is None:
            return Response(
                {"detail": "Le compte connecté doit être associé à un personnel responsable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lignes = request.data.get("lignes", [])
        if not isinstance(lignes, list) or not lignes:
            return Response(
                {"lignes": "Ajoutez au moins une ligne de réception."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()
        data["ent_numero"] = Entree._generer_numero()
        data["ent_responsable"] = str(responsable.pk)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        entree = serializer.save()

        for index, ligne in enumerate(lignes, start=1):
            article_id = ligne.get("entd_article") if isinstance(ligne, dict) else None
            quantite = ligne.get("entd_quantite") if isinstance(ligne, dict) else None
            prix = ligne.get("entd_prix_unitaire") if isinstance(ligne, dict) else None
            emplacement_id = ligne.get("entd_emplacement") if isinstance(ligne, dict) else None
            article = Article.objects.filter(pk=article_id).first()
            emplacement = Emplacement.objects.filter(pk=emplacement_id).first()
            if article is None or emplacement is None:
                transaction.set_rollback(True)
                return Response({"lignes": f"Ligne {index} : article ou emplacement invalide."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                quantite = int(quantite)
                prix = float(prix)
            except (TypeError, ValueError):
                transaction.set_rollback(True)
                return Response({"lignes": f"Ligne {index} : quantité ou prix invalide."}, status=status.HTTP_400_BAD_REQUEST)
            if quantite <= 0 or prix < 0:
                transaction.set_rollback(True)
                return Response({"lignes": f"Ligne {index} : quantité positive et prix positif ou nul requis."}, status=status.HTTP_400_BAD_REQUEST)
            entree.ajouter_ligne(article, emplacement, quantite, prix)

        return Response(self.get_serializer(entree).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if self.get_object().ent_appliquee:
            return Response({"detail": "Une entrée appliquée au stock ne peut plus être modifiée."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if self.get_object().ent_appliquee:
            return Response({"detail": "Une entrée appliquée au stock ne peut plus être supprimée."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

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

class EntreeDetailViewSet(StockModelViewSet):

    queryset = EntreeDetail.objects.all().select_related(
        "entd_entree",
        "entd_article",
    )

    serializer_class = EntreeDetailSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        if serializer.validated_data["entd_entree"].ent_appliquee:
            raise ValidationError("Les lignes d'une entrée appliquée ne sont plus modifiables.")
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance.entd_entree.ent_appliquee:
            raise ValidationError("Les lignes d'une entrée appliquée ne sont plus modifiables.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.entd_entree.ent_appliquee:
            raise ValidationError("Les lignes d'une entrée appliquée ne sont plus modifiables.")
        instance.delete()


# ============================================================
# SORTIES
# ============================================================

class SortieViewSet(StockModelViewSet):

    queryset = Sortie.objects.all().select_related(
        "sor_demande",
        "sor_centre_responsabilite",
        "sor_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = SortieSerializer
    permission_classes = [IsAuthenticated]

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

        responsable = getattr(request.user, "user_personnel", None)
        if responsable is None:
            return Response({"detail": "Le compte connecté doit être lié à un personnel."}, status=status.HTTP_400_BAD_REQUEST)

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

class SortieDetailViewSet(StockModelViewSet):

    queryset = SortieDetail.objects.all().select_related(
        "sord_sortie",
        "sord_article",
    )

    serializer_class = SortieDetailSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# RETOURS
# ============================================================

class RetourViewSet(StockModelViewSet):

    queryset = Retour.objects.all().select_related(
        "ret_centre_responsabilite",
        "ret_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = RetourSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "ret_numero",
    ]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        responsable = getattr(request.user, "user_personnel", None)
        if responsable is None:
            return Response({"detail": "Le compte connecté doit être lié à un personnel."}, status=status.HTTP_400_BAD_REQUEST)
        lignes = request.data.get("lignes", [])
        if not isinstance(lignes, list) or not lignes:
            return Response({"lignes": "Ajoutez au moins une ligne de retour."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["ret_numero"] = Retour._generer_numero()
        data["ret_responsable"] = str(responsable.pk)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        retour = serializer.save()
        for index, ligne in enumerate(lignes, start=1):
            article = Article.objects.filter(pk=ligne.get("retd_article") if isinstance(ligne, dict) else None).first()
            emplacement = Emplacement.objects.filter(pk=ligne.get("retd_emplacement") if isinstance(ligne, dict) else None).first()
            try:
                quantite = int(ligne.get("retd_quantite"))
            except (TypeError, ValueError):
                quantite = 0
            if article is None or emplacement is None or quantite <= 0:
                transaction.set_rollback(True)
                return Response({"lignes": f"Ligne {index} invalide."}, status=status.HTTP_400_BAD_REQUEST)
            retour.ajouter_ligne(article, emplacement, quantite, ligne.get("retd_etat_article", ""))
        return Response(self.get_serializer(retour).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if self.get_object().ret_appliquee:
            return Response({"detail": "Un retour appliqué ne peut plus être modifié."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

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

class RetourDetailViewSet(StockModelViewSet):

    queryset = RetourDetail.objects.all().select_related(
        "retd_retour",
        "retd_article",
    )

    serializer_class = RetourDetailSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# DOTATIONS
# ============================================================

class DotationDirecteViewSet(StockModelViewSet):

    queryset = DotationDirecte.objects.all().select_related(
        "dot_centre_responsabilite",
        "dot_responsable",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = DotationDirecteSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "dot_numero",
        "dot_justification",
    ]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        responsable = getattr(request.user, "user_personnel", None)
        justification = str(request.data.get("dot_justification", "")).strip()
        lignes = request.data.get("lignes", [])
        if responsable is None:
            return Response({"detail": "Le compte connecté doit être lié à un personnel."}, status=status.HTTP_400_BAD_REQUEST)
        if not justification:
            return Response({"dot_justification": "La justification est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(lignes, list) or not lignes:
            return Response({"lignes": "Ajoutez au moins une ligne de dotation."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["dot_numero"] = DotationDirecte._generer_numero()
        data["dot_responsable"] = str(responsable.pk)
        data["dot_justification"] = justification
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        dotation = serializer.save()
        for index, ligne in enumerate(lignes, start=1):
            article = Article.objects.filter(pk=ligne.get("dotd_article") if isinstance(ligne, dict) else None).first()
            emplacement = Emplacement.objects.filter(pk=ligne.get("dotd_emplacement") if isinstance(ligne, dict) else None).first()
            try:
                quantite = int(ligne.get("dotd_quantite"))
            except (TypeError, ValueError):
                quantite = 0
            if article is None or emplacement is None or quantite <= 0:
                transaction.set_rollback(True)
                return Response({"lignes": f"Ligne {index} invalide."}, status=status.HTTP_400_BAD_REQUEST)
            dotation.ajouter_ligne(article, emplacement, quantite)
        return Response(self.get_serializer(dotation).data, status=status.HTTP_201_CREATED)

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

class DotationDirecteDetailViewSet(StockModelViewSet):

    queryset = DotationDirecteDetail.objects.all().select_related(
        "dotd_dotation",
        "dotd_article",
    )

    serializer_class = DotationDirecteDetailSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# INVENTAIRES
# ============================================================

class InventaireViewSet(StockModelViewSet):

    @staticmethod
    def _next_numero():
        from django.utils import timezone
        prefix = f"INV-{timezone.localdate().year}-"
        numbers = []
        for numero in Inventaire.objects.filter(inv_numero__startswith=prefix).values_list("inv_numero", flat=True):
            suffix = numero.removeprefix(prefix)
            if suffix.isdigit():
                numbers.append(int(suffix))
        return f"{prefix}{max(numbers, default=0) + 1:04d}"

    queryset = Inventaire.objects.all().select_related(
        "inv_responsable",
        "inv_validateur",
    ).prefetch_related(
        "lignes",
    )

    serializer_class = InventaireSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "inv_numero",
    ]

    ordering_fields = [
        "inv_numero",
        "inv_date_debut",
        "inv_date_fin",
    ]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        responsable = getattr(request.user, "user_personnel", None)
        numero = str(request.data.get("inv_numero", "")).strip() or self._next_numero()
        type_inventaire = request.data.get("inv_type", "total")
        articles_ids = request.data.get("articles", [])
        emplacements_ids = request.data.get("emplacements", [])
        if responsable is None:
            return Response({"detail": "Le compte connecté doit être lié à un personnel."}, status=status.HTTP_400_BAD_REQUEST)
        if not numero:
            return Response({"inv_numero": "Le numéro d'inventaire est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        if type_inventaire not in ("total", "partiel"):
            return Response({"inv_type": "Type d'inventaire invalide."}, status=status.HTTP_400_BAD_REQUEST)
        articles = None
        emplacements = None
        if type_inventaire == "partiel":
            if not isinstance(articles_ids, list) or not isinstance(emplacements_ids, list):
                return Response({"articles": "Sélectionnez au moins un article pour un inventaire partiel."}, status=status.HTTP_400_BAD_REQUEST)
            if not articles_ids and not emplacements_ids:
                return Response({"detail": "Sélectionnez au moins un article ou un emplacement pour un inventaire partiel."}, status=status.HTTP_400_BAD_REQUEST)
            articles = Article.objects.filter(pk__in=articles_ids, art_etat="actif") if articles_ids else Article.objects.filter(art_etat="actif")
            if articles_ids and articles.count() != len(set(articles_ids)):
                return Response({"articles": "Un ou plusieurs articles sont invalides ou inactifs."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            if emplacements_ids:
                emplacements = Emplacement.objects.filter(pk__in=emplacements_ids)
                if emplacements.count() != len(set(emplacements_ids)):
                    raise ValueError("Un ou plusieurs emplacements sont invalides.")
            inventaire = Inventaire.demarrer(numero, responsable, type_inventaire, articles, emplacements)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(inventaire).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.inv_statut == "cloture":
            raise ValidationError("Un inventaire clôturé ne peut pas être supprimé.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def ajouter_ligne(self, request, pk=None):
        inventaire = self.get_object()
        if inventaire.inv_statut != "en_cours":
            return Response({"detail": "Un inventaire clôturé ne peut plus recevoir de ligne."}, status=status.HTTP_400_BAD_REQUEST)
        code = str(request.data.get("code_article", "")).strip()
        emplacement_code = str(request.data.get("emplacement", "")).strip()
        if not code or not emplacement_code:
            return Response({"detail": "Le code article et l’emplacement sont obligatoires."}, status=status.HTTP_400_BAD_REQUEST)
        article = get_object_or_404(Article, pk=code, art_etat="actif")
        if not re.fullmatch(r"[A-Za-z0-9_-]{2,30}", emplacement_code):
            return Response({"emplacement": "Utilisez un code simple : RACK11, MAG-01, ZONE_A…"}, status=status.HTTP_400_BAD_REQUEST)
        emplacement, _ = Emplacement.objects.get_or_create(
            emp_code=emplacement_code.upper(),
            defaults={"emp_description": "Emplacement créé depuis un inventaire"},
        )
        if LigneInventaire.objects.filter(linv_inventaire=inventaire, linv_article=article, linv_emplacement=emplacement).exists():
            return Response({"detail": "Cette ligne Article + Emplacement existe déjà dans cet inventaire."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = Decimal(str(request.data.get("quantite_reelle", "0")))
            if quantity < 0:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return Response({"quantite_reelle": "La quantité réelle doit être positive ou nulle."}, status=status.HTTP_400_BAD_REQUEST)
        stock = article.stocks_emplacements.filter(ste_emplacement=emplacement).first()
        line = LigneInventaire.objects.create(
            linv_inventaire=inventaire, linv_article=article, linv_emplacement=emplacement,
            linv_quantite_theorique=stock.ste_quantite if stock else Decimal("0"),
            linv_quantite_reelle=quantity, linv_prix_unitaire=article.art_prix_unitaire,
            linv_note=str(request.data.get("note", "")).strip() or None,
        )
        return Response(LigneInventaireSerializer(line).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cloturer(self, request, pk=None):

        inventaire = self.get_object()

        validateur = getattr(request.user, "user_personnel", None)
        if validateur is None:
            return Response(
                {"detail": "Le compte connecté doit être lié à un personnel."},
                status=status.HTTP_400_BAD_REQUEST,
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

class LigneInventaireViewSet(StockModelViewSet):

    queryset = LigneInventaire.objects.all().select_related(
        "linv_inventaire",
        "linv_article",
    )

    serializer_class = LigneInventaireSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        inventaire_id = self.request.query_params.get("linv_inventaire")
        return queryset.filter(linv_inventaire_id=inventaire_id) if inventaire_id else queryset

    def perform_update(self, serializer):
        if serializer.instance.linv_inventaire.inv_statut != "en_cours":
            raise ValidationError("Un inventaire clôturé ne peut plus être modifié.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.linv_inventaire.inv_statut != "en_cours":
            raise ValidationError("Une ligne d’un inventaire clôturé ne peut pas être supprimée.")
        instance.delete()

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

class JournalAuditViewSet(StockReadOnlyModelViewSet):

    queryset = JournalAudit.objects.all().select_related(
        "aud_personnel"
    ).order_by("-aud_date")

    serializer_class = JournalAuditSerializer
    permission_classes = [IsAuthenticated]

    search_fields = [
        "aud_action",
        "aud_details",
    ]

    ordering_fields = [
        "aud_date",
        "aud_action",
    ]
