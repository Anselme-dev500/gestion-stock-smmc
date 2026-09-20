from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategorieViewSet, EmplacementViewSet, FournisseurViewSet, ArticleViewSet,
    DemandeViewSet, EntreeViewSet, SortieViewSet, RetourViewSet,
    DotationDirecteViewSet, InventaireViewSet, JournalAuditViewSet, DashboardView
)

router = DefaultRouter()
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'emplacements', EmplacementViewSet, basename='emplacement')
router.register(r'fournisseurs', FournisseurViewSet, basename='fournisseur')
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'demandes', DemandeViewSet, basename='demande')
router.register(r'entrees', EntreeViewSet, basename='entree')
router.register(r'sorties', SortieViewSet, basename='sortie')
router.register(r'retours', RetourViewSet, basename='retour')
router.register(r'dotations', DotationDirecteViewSet, basename='dotation')
router.register(r'inventaires', InventaireViewSet, basename='inventaire')
router.register(r'audit', JournalAuditViewSet, basename='audit')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='stock-dashboard'),
    path('', include(router.urls)),
]
