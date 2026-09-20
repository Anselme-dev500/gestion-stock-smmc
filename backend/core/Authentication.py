"""
Backend d'authentification personnalisé : permet de se connecter
avec le matricule (Personnel.per_matricule) au lieu du username Django.

À placer dans : backend/core/authentication.py
"""
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from personnel.models import Personnel


class MatriculeBackend(ModelBackend):
    """
    Authentifie un utilisateur à partir de son matricule Personnel,
    en vérifiant le mot de passe sur le compte User lié (per_user).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        matricule = username  # le formulaire/API envoie le matricule dans le champ "username"
        if not matricule or not password:
            return None

        try:
            personnel = Personnel.objects.select_related("per_user").get(
                per_matricule=matricule, per_actif=True
            )
        except Personnel.DoesNotExist:
            return None

        user = personnel.per_user
        if user is None:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None