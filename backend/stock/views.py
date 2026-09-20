from django.db import transaction
from django.db.models import Sum, F, Q, Count
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Categorie, Emplacement, Fournisseur, Article,
    Demande, LigneDemande, Validation, PieceJointe,
    Entree, EntreeDetail, Sortie, SortieDetail,
    Retour, RetourDetail, DotationDirecte, DotationDirecteDetail,
    Inventaire, LigneInventaire, JournalAudit,
    StatutDemande, NiveauValidation, StatutValidation, StatutInventaire
)
from .serializers import (
    CategorieSerializer, EmplacementSerializer, FournisseurSerializer, ArticleSerializer,
    DemandeDetailSerializer, DemandeCreateUpdateSerializer, ValidationSerializer, PieceJointeSerializer,
    EntreeSerializer, SortieSerializer, RetourSerializer, DotationDirecteSerializer,
    InventaireSerializer, LigneInventaireSerializer, JournalAuditSerializer
)
from personnel.models import Personnel
from core.models import StockProfil, RoleStock


def log_action(personnel, action_name, details=""):
    """Helper pour enregistrer une action dans le journal d'audit."""
    try:
        JournalAudit.objects.create(
            aud_personnel=personnel,
            aud_action=action_name,
            aud_details=details
        )
    except Exception:
        pass


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all().order_by('cat_nom')
    serializer_class = CategorieSerializer
    permission_classes = [permissions.AllowAny]


class EmplacementViewSet(viewsets.ModelViewSet):
    queryset = Emplacement.objects.all().order_by('emp_code')
    serializer_class = EmplacementSerializer
    permission_classes = [permissions.AllowAny]


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all().order_by('frn_nom')
    serializer_class = FournisseurSerializer
    permission_classes = [permissions.AllowAny]


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().select_related('art_categorie', 'art_emplacement').order_by('art_code_article')
    serializer_class = ArticleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        cat_id = self.request.query_params.get('categorie')
        emp_id = self.request.query_params.get('emplacement')
        search = self.request.query_params.get('search')
        en_alerte = self.request.query_params.get('en_alerte')

        if cat_id:
            qs = qs.filter(art_categorie_id=cat_id)
        if emp_id:
            qs = qs.filter(art_emplacement_id=emp_id)
        if search:
            qs = qs.filter(Q(art_code_article__icontains=search) | Q(art_designation__icontains=search) | Q(art_reference__icontains=search))
        if en_alerte == 'true':
            qs = qs.filter(art_quantite_stock__lt=F('art_seuil_min'))

        return qs

    @action(detail=False, methods=['get'])
    def alertes(self, request):
        """Retourne la liste des articles dont le stock est inférieur au seuil min."""
        articles_alerte = Article.objects.filter(art_quantite_stock__lt=F('art_seuil_min'))
        serializer = self.get_serializer(articles_alerte, many=True)
        return Response(serializer.data)


class DemandeViewSet(viewsets.ModelViewSet):
    queryset = Demande.objects.all().select_related('dem_centre_responsabilite', 'dem_demandeur').prefetch_related('lignes', 'validations', 'pieces_jointes').order_by('-dem_date')
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DemandeCreateUpdateSerializer
        return DemandeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        statut = self.request.query_params.get('statut')
        type_dem = self.request.query_params.get('type')
        demandeur_id = self.request.query_params.get('demandeur')

        if statut:
            qs = qs.filter(dem_statut=statut)
        if type_dem:
            qs = qs.filter(dem_type=type_dem)
        if demandeur_id:
            qs = qs.filter(dem_demandeur_id=demandeur_id)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        personnel = getattr(user, 'user_personnel', None)
        demande = serializer.save(dem_demandeur=personnel if personnel else None)
        log_action(personnel, "CREATION_DEMANDE", f"Création de la demande N° {demande.dem_numero}")

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """
        Endpoint de validation d'une étape du circuit 4 niveaux.
        Niveaux:
        1. 'dept_demandeur' -> Statut passe à 'en_cours'
        2. 'responsable_stock' -> Statut reste 'en_cours' ou mise à jour quantite_accordee
        3. 'dept_appro' -> Statut prêt pour livraison
        """
        demande = self.get_object()
        user = request.user
        personnel = getattr(user, 'user_personnel', None)
        niveau = request.data.get('niveau')
        commentaire = request.data.get('commentaire', '')
        lignes_accordees = request.data.get('lignes_accordees', [])

        if not niveau or niveau not in dict(NiveauValidation.choices):
            return Response({"error": "Niveau de validation invalide"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Enregistrer la validation
            Validation.objects.create(
                val_demande=demande,
                val_niveau=niveau,
                val_statut=StatutValidation.VALIDEE,
                val_validateur=personnel,
                val_commentaire=commentaire
            )

            # Si validation Responsable Stock, mise à jour des quantités accordées
            if niveau == NiveauValidation.RESPONSABLE_STOCK and lignes_accordees:
                for item in lignes_accordees:
                    ligne_id = item.get('ldem_id')
                    qte_accordee = item.get('quantite_accordee')
                    if ligne_id and qte_accordee is not None:
                        LigneDemande.objects.filter(ldem_id=ligne_id, ldem_demande=demande).update(ldem_quantite_accordee=qte_accordee)

            # Mettre à jour le statut global
            if niveau == NiveauValidation.DEPT_DEMANDEUR:
                demande.dem_statut = StatutDemande.EN_COURS
            elif niveau == NiveauValidation.DEPT_APPRO:
                demande.dem_statut = StatutDemande.EN_COURS  # Validé niveau approvisionnement, en attente de livraison
            demande.save()

            log_action(personnel, f"VALIDATION_DEMANDE_{niveau.upper()}", f"Validation niveau {niveau} pour la demande {demande.dem_numero}")

        return Response(DemandeDetailSerializer(demande).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        """Refus motivé d'une demande (interrompt le circuit)."""
        demande = self.get_object()
        user = request.user
        personnel = getattr(user, 'user_personnel', None)
        niveau = request.data.get('niveau')
        commentaire = request.data.get('commentaire', 'Refusé')

        with transaction.atomic():
            Validation.objects.create(
                val_demande=demande,
                val_niveau=niveau or NiveauValidation.DEPT_DEMANDEUR,
                val_statut=StatutValidation.REFUSEE,
                val_validateur=personnel,
                val_commentaire=commentaire
            )
            demande.dem_statut = StatutDemande.REFUSEE
            demande.save()

            log_action(personnel, "REFUS_DEMANDE", f"Refus de la demande {demande.dem_numero} au niveau {niveau}: {commentaire}")

        return Response(DemandeDetailSerializer(demande).data)

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        """
        Remise physique des fournitures (Niveau 4):
        Génère automatiquement un mouvement de Sortie et décrémente le stock.
        """
        demande = self.get_object()
        user = request.user
        personnel = getattr(user, 'user_personnel', None)

        if demande.dem_statut == StatutDemande.LIVREE:
            return Response({"error": "Cette demande est déjà livrée"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            today_str = timezone.now().strftime("%Y%m%d")
            import random
            sortie_num = f"SOR-{today_str}-{random.randint(100, 999)}"

            sortie = Sortie.objects.create(
                sor_numero=sortie_num,
                sor_demande=demande,
                sor_centre_responsabilite=demande.dem_centre_responsabilite,
                sor_responsable=personnel,
                sor_direction=demande.dem_direction
            )

            for ligne in demande.lignes.all():
                qte_a_livrer = ligne.ldem_quantite_accordee if ligne.ldem_quantite_accordee > 0 else ligne.ldem_quantite_demandee
                article = ligne.ldem_article

                SortieDetail.objects.create(
                    sord_sortie=sortie,
                    sord_article=article,
                    sord_quantite=qte_a_livrer
                )

                # Décrémentation du stock
                article.art_quantite_stock = max(0, article.art_quantite_stock - qte_a_livrer)
                article.save()

            demande.dem_statut = StatutDemande.LIVREE
            demande.save()

            log_action(personnel, "LIVRAISON_DEMANDE", f"Livraison effectuée pour la demande {demande.dem_numero} - Mouvement Sortie {sortie_num}")

        return Response(DemandeDetailSerializer(demande).data)


class EntreeViewSet(viewsets.ModelViewSet):
    queryset = Entree.objects.all().select_related('ent_fournisseur', 'ent_responsable').prefetch_related('lignes').order_by('-ent_date')
    serializer_class = EntreeSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        personnel = getattr(self.request.user, 'user_personnel', None)
        entree = serializer.save(ent_responsable=personnel if personnel else None)
        log_action(personnel, "CREATION_ENTREE", f"Enregistrement Entree N° {entree.ent_numero}")


class SortieViewSet(viewsets.ModelViewSet):
    queryset = Sortie.objects.all().select_related('sor_demande', 'sor_centre_responsabilite', 'sor_responsable').prefetch_related('lignes').order_by('-sor_date')
    serializer_class = SortieSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        personnel = getattr(self.request.user, 'user_personnel', None)
        sortie = serializer.save(sor_responsable=personnel if personnel else None)
        log_action(personnel, "CREATION_SORTIE", f"Enregistrement Sortie N° {sortie.sor_numero}")


class RetourViewSet(viewsets.ModelViewSet):
    queryset = Retour.objects.all().select_related('ret_centre_responsabilite', 'ret_responsable').prefetch_related('lignes').order_by('-ret_date')
    serializer_class = RetourSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        personnel = getattr(self.request.user, 'user_personnel', None)
        retour = serializer.save(ret_responsable=personnel if personnel else None)
        log_action(personnel, "CREATION_RETOUR", f"Enregistrement Retour N° {retour.ret_numero}")


class DotationDirecteViewSet(viewsets.ModelViewSet):
    queryset = DotationDirecte.objects.all().select_related('dot_centre_responsabilite', 'dot_responsable').prefetch_related('lignes').order_by('-dot_date')
    serializer_class = DotationDirecteSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        personnel = getattr(self.request.user, 'user_personnel', None)
        dotation = serializer.save(dot_responsable=personnel if personnel else None)
        log_action(personnel, "CREATION_DOTATION", f"Enregistrement Dotation N° {dotation.dot_numero}")


class InventaireViewSet(viewsets.ModelViewSet):
    queryset = Inventaire.objects.all().select_related('inv_responsable', 'inv_validateur').prefetch_related('lignes').order_by('-inv_date_debut')
    serializer_class = InventaireSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        personnel = getattr(self.request.user, 'user_personnel', None)
        import random
        inv_num = f"INV-{timezone.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"
        inventaire = serializer.save(inv_numero=inv_num, inv_responsable=personnel if personnel else None)

        # Génération automatique des lignes d'inventaire pour tous les articles actifs
        articles = Article.objects.filter(art_etat='actif')
        for article in articles:
            LigneInventaire.objects.create(
                linv_inventaire=inventaire,
                linv_article=article,
                linv_quantite_theorique=article.art_quantite_stock,
                linv_quantite_reelle=article.art_quantite_stock,
                linv_valeur_theorique=article.art_quantite_stock * article.art_prix_unitaire
            )

        log_action(personnel, "CREATION_INVENTAIRE", f"Initialisation de l'inventaire N° {inv_num}")

    @action(detail=True, methods=['post'])
    def enregistrer_comptage(self, request, pk=None):
        """Enregistre les quantités réelles comptées."""
        inventaire = self.get_object()
        comptages = request.data.get('comptages', [])

        for item in comptages:
            ligne_id = item.get('linv_id')
            qte_reelle = item.get('quantite_reelle')
            note = item.get('note', '')

            if ligne_id and qte_reelle is not None:
                ligne = LigneInventaire.objects.filter(linv_id=ligne_id, linv_inventaire=inventaire).first()
                if ligne:
                    ligne.linv_quantite_reelle = qte_reelle
                    ligne.linv_valeur_ecart = (qte_reelle - ligne.linv_quantite_theorique) * ligne.linv_article.art_prix_unitaire
                    ligne.linv_note = note
                    ligne.save()

        return Response(InventaireSerializer(inventaire).data)

    @action(detail=True, methods=['post'])
    def ajuster(self, request, pk=None):
        """Clôture et réajuste les stocks réels dans la base de données."""
        inventaire = self.get_object()
        personnel = getattr(request.user, 'user_personnel', None)

        with transaction.atomic():
            for ligne in inventaire.lignes.all():
                article = ligne.linv_article
                article.art_quantite_stock = ligne.linv_quantite_reelle
                article.save()

            inventaire.inv_statut = StatutInventaire.VALIDE
            inventaire.inv_date_fin = timezone.now().date()
            inventaire.inv_validateur = personnel
            inventaire.save()

            log_action(personnel, "VALIDE_INVENTAIRE", f"Validation et réajustement des stocks via Inventaire N° {inventaire.inv_numero}")

        return Response(InventaireSerializer(inventaire).data)


class DashboardView(APIView):
    """Fournit les statistiques KPI globales pour le tableau de bord."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total_articles = Article.objects.count()
        articles_alerte = Article.objects.filter(art_quantite_stock__lt=F('art_seuil_min')).count()
        demandes_soumises = Demande.objects.filter(dem_statut=StatutDemande.SOUMISE).count()
        demandes_en_cours = Demande.objects.filter(dem_statut=StatutDemande.EN_COURS).count()
        demandes_livrees = Demande.objects.filter(dem_statut=StatutDemande.LIVREE).count()

        valeur_totale_stock = Article.objects.aggregate(
            valeur=Sum(F('art_quantite_stock') * F('art_prix_unitaire'))
        )['valeur'] or 0

        derniers_mouvements = Sortie.objects.select_related('sor_centre_responsabilite').order_by('-sor_date')[:5]
        mouvements_data = [{
            "id": str(s.sor_id),
            "numero": s.sor_numero,
            "date": s.sor_date,
            "service": s.sor_centre_responsabilite.cr_nom if s.sor_centre_responsabilite else "N/A"
        } for s in derniers_mouvements]

        return Response({
            "total_articles": total_articles,
            "articles_alerte": articles_alerte,
            "demandes_soumises": demandes_soumises,
            "demandes_en_cours": demandes_en_cours,
            "demandes_livrees": demandes_livrees,
            "valeur_totale_stock": float(valeur_totale_stock),
            "derniers_mouvements": mouvements_data
        })


class JournalAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalAudit.objects.all().select_related('aud_personnel').order_by('-aud_date')
    serializer_class = JournalAuditSerializer
    permission_classes = [permissions.AllowAny]
