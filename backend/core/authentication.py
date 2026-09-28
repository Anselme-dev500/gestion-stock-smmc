"""Authentification Django avec le matricule de la fiche Personnel."""

from django.contrib.auth.backends import ModelBackend
from personnel.models import Personnel


class MatriculeBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, matricule=None, **kwargs):
        matricule = matricule or username
        if not matricule or not password:
            return None
        try:
            personne = Personnel.objects.select_related("per_user").get(
                per_matricule=matricule,
                per_actif=True,
            )
        except Personnel.DoesNotExist:
            return None
        user = personne.per_user
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
