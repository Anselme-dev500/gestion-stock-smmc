"""Connexion JWT du module stock par matricule."""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from personnel.models import Personnel
from .token_lifetime import access_with_duration


class SMMCLoginSerializer(TokenObtainPairSerializer):
    username_field = 'matricule'

    def validate(self, attrs):
        data = super().validate(attrs)
        try:
            personnel = self.user.user_personnel
            profil = personnel.stock_profil
        except (Personnel.DoesNotExist, AttributeError):
            raise serializers.ValidationError('Aucun profil Stock lié à ce compte.')
        if not personnel.per_actif or not profil.pst_actif:
            raise serializers.ValidationError('Compte Stock désactivé.')
        data['role_stock'] = profil.pst_role
        from rest_framework_simplejwt.tokens import RefreshToken
        data['access'] = access_with_duration(RefreshToken(data['refresh']))
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        personnel = user.user_personnel
        token['matricule'] = personnel.per_matricule
        token['nom'] = personnel.per_nom
        token['prenom'] = personnel.per_prenom or ''
        token['role_stock'] = personnel.stock_profil.pst_role
        return token
