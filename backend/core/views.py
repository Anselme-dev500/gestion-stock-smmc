"""
À placer dans : backend/core/views.py
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class MatriculeTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "matricule"  # renomme le champ attendu par l'API

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        personnel = getattr(user, "user_personnel", None)
        if personnel:
            token["matricule"] = personnel.per_matricule
            token["nom"] = f"{personnel.per_nom} {personnel.per_prenom or ''}".strip()
            token["role_stock"] = getattr(
                getattr(personnel, "stock_profil", None), "pst_role", None
            )
        return token


class MatriculeTokenObtainPairView(TokenObtainPairView):
    serializer_class = MatriculeTokenObtainPairSerializer
