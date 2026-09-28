from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MouvementConsolideView,
    RapportStockView,
    NotificationsView,
    CentreResponsabiliteListView,
    CategorieViewSet,
    EmplacementViewSet,
    FournisseurViewSet,
    ArticleViewSet,

    DemandeViewSet,
    LigneDemandeViewSet,
    ValidationViewSet,
    PieceJointeViewSet,

    EntreeViewSet,
    EntreeDetailViewSet,

    SortieViewSet,
    SortieDetailViewSet,

    RetourViewSet,
    RetourDetailViewSet,

    DotationDirecteViewSet,
    DotationDirecteDetailViewSet,

    InventaireViewSet,
    LigneInventaireViewSet,

    JournalAuditViewSet,
)


router = DefaultRouter()


# Référentiels
router.register(
    r'categories',
    CategorieViewSet,
    basename='categorie'
)

router.register(
    r'emplacements',
    EmplacementViewSet,
    basename='emplacement'
)

router.register(
    r'fournisseurs',
    FournisseurViewSet,
    basename='fournisseur'
)

router.register(
    r'articles',
    ArticleViewSet,
    basename='article'
)


# Demandes
router.register(
    r'demandes',
    DemandeViewSet,
    basename='demande'
)

router.register(
    r'lignes-demandes',
    LigneDemandeViewSet,
    basename='ligne-demande'
)

router.register(
    r'validations',
    ValidationViewSet,
    basename='validation'
)

router.register(
    r'pieces-jointes',
    PieceJointeViewSet,
    basename='piece-jointe'
)


# Entrées
router.register(
    r'entrees',
    EntreeViewSet,
    basename='entree'
)

router.register(
    r'lignes-entrees',
    EntreeDetailViewSet,
    basename='entree-detail'
)


# Sorties
router.register(
    r'sorties',
    SortieViewSet,
    basename='sortie'
)

router.register(
    r'lignes-sorties',
    SortieDetailViewSet,
    basename='sortie-detail'
)


# Retours
router.register(
    r'retours',
    RetourViewSet,
    basename='retour'
)

router.register(
    r'lignes-retours',
    RetourDetailViewSet,
    basename='retour-detail'
)


# Dotations
router.register(
    r'dotations',
    DotationDirecteViewSet,
    basename='dotation'
)

router.register(
    r'lignes-dotations',
    DotationDirecteDetailViewSet,
    basename='dotation-detail'
)


# Inventaires
router.register(
    r'inventaires',
    InventaireViewSet,
    basename='inventaire'
)

router.register(
    r'lignes-inventaires',
    LigneInventaireViewSet,
    basename='ligne-inventaire'
)


# Audit
router.register(
    r'audit',
    JournalAuditViewSet,
    basename='audit'
)


urlpatterns = [
    path('chef/', include('stock.chef_urls')),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('centres-responsabilite/', CentreResponsabiliteListView.as_view(), name='centres-responsabilite'),
    path('mouvements/', MouvementConsolideView.as_view(), name='mouvements-consolides'),
    path('rapports/', RapportStockView.as_view(), name='rapports-stock'),
] + router.urls
