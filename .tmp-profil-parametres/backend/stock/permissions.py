"""Accès au module Stock en fonction du profil Stock actif."""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from core.models import RoleStock


class StockModulePermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser:
            return True
        person = getattr(user, 'user_personnel', None)
        if not person or not person.per_actif:
            return False
        profile = getattr(person, 'stock_profil', None)
        if not profile or not profile.pst_actif:
            return False
        role = profile.pst_role
        if role in (RoleStock.SUPER_ADMIN, RoleStock.RESPONSABLE_STOCK):
            return True
        # Toutes les opérations métier du chef passent par l'API /chef/.
        # Garder la lecture des référentiels, articles et demandes en mode sûr.
        if request.method in SAFE_METHODS and view.__class__.__name__ in ('ArticleViewSet', 'CategorieViewSet', 'EmplacementViewSet', 'DemandeViewSet'):
            return True
        if role == RoleStock.CHEF_SERVICE and view.__class__.__name__ == 'DemandeViewSet' and view.action == 'create':
            return True
        return False
