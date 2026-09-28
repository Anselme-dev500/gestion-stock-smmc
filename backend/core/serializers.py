"""JWT de connexion au module stock, via le matricule du personnel."""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from personnel.models import Personnel


class SMMCLoginSerializer(TokenObtainPairSerializer):
    # SimpleJWT construit le formulaire d'entrée avec ce nom et le transmet
    # comme argument nommé au backend authenticate().
    username_field = "matricule"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        try:
            personne = user.user_personnel
        except Personnel.DoesNotExist:
            return token
        token["matricule"] = personne.per_matricule
        token["nom"] = personne.per_nom
        token["prenom"] = personne.per_prenom or ""
        profil = getattr(personne, "stock_profil", None)
        token["role_stock"] = profil.pst_role if profil and profil.pst_actif else None
        return token
