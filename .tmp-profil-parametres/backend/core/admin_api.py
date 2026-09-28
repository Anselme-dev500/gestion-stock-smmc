"""API d'administration du module Stock. Réservée au superutilisateur Django."""
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from personnel.models import Personnel
from rh_fonction.models import RhFonction
from rh_departement.models import RhDepartement
from .models import RoleStock, StockProfil
from .token_lifetime import access_with_duration
from .models import StockConfiguration, default_stock_settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


def check_stock_password(password, user=None):
    config = StockConfiguration.objects.filter(pk=1).values_list("valeurs", flat=True).first() or default_stock_settings()
    if len(password) < config.get("longueur_mot_de_passe", 8):
        raise serializers.ValidationError({"password": "Mot de passe trop court selon la politique du stock."})
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"password": exc.messages})


class SuperuserOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.is_superuser)


class AdminTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_superuser or not self.user.is_active:
            raise serializers.ValidationError('Accès réservé au super administrateur.')
        data['username'] = self.user.username
        from rest_framework_simplejwt.tokens import RefreshToken
        data['access'] = access_with_duration(RefreshToken(data['refresh']))
        return data


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenSerializer


class StockAccountSerializer(serializers.Serializer):
    per_id = serializers.UUIDField(read_only=True)
    matricule = serializers.CharField(source='per_matricule', read_only=True)
    nom = serializers.CharField(source='per_nom', read_only=True)
    prenom = serializers.CharField(source='per_prenom', read_only=True)
    compte_actif = serializers.BooleanField(source='per_user.is_active', read_only=True)
    role = serializers.CharField(source='stock_profil.pst_role', read_only=True)
    profil_actif = serializers.BooleanField(source='stock_profil.pst_actif', read_only=True)
    departement_id = serializers.UUIDField(source='per_departement_id', read_only=True)


class CreateStockAccountSerializer(serializers.Serializer):
    matricule = serializers.CharField(max_length=30)
    nom = serializers.CharField(max_length=100)
    prenom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance = serializers.DateField()
    numero_cin = serializers.CharField(max_length=20)
    date_embauche = serializers.DateField()
    type_contrat = serializers.ChoiceField(choices=Personnel._meta.get_field('per_type_contrat').choices)
    fonction_id = serializers.PrimaryKeyRelatedField(queryset=RhFonction.objects.all())
    role = serializers.ChoiceField(choices=RoleStock.choices, default=RoleStock.RESPONSABLE_STOCK)
    departement_id = serializers.PrimaryKeyRelatedField(queryset=RhDepartement.objects.filter(dep_actif=True), required=False, allow_null=True)

    def validate(self, data):
        if data['role'] == RoleStock.CHEF_DEPARTEMENT and not data.get('departement_id'):
            raise serializers.ValidationError({'departement_id': 'Département obligatoire pour le chef de département.'})
        check_stock_password(data['password'])
        return data
    password = serializers.CharField(min_length=8, write_only=True, trim_whitespace=False)

    def validate_matricule(self, value):
        if Personnel.objects.filter(per_matricule=value).exists() or User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ce matricule existe déjà. Associer la fiche existante depuis Django Admin.')
        return value

    def validate_numero_cin(self, value):
        if Personnel.objects.filter(per_numero_cin=value).exists():
            raise serializers.ValidationError('Ce numéro CIN existe déjà.')
        return value


class StockAccountsView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]

    def get(self, request):
        people = Personnel.objects.filter(stock_profil__isnull=False).select_related('per_user', 'stock_profil').order_by('per_nom')
        functions = RhFonction.objects.filter(fn_actif=True).order_by('fn_nom').values('fn_id', 'fn_nom')
        departements = list(RhDepartement.objects.filter(dep_actif=True).order_by('dep_nom').values('dep_id', 'dep_nom'))
        return Response({'users': StockAccountSerializer(people, many=True).data, 'fonctions': list(functions), 'departements': departements, 'roles': [{'value': key, 'label': label} for key, label in RoleStock.choices]})

    @transaction.atomic
    def post(self, request):
        serializer = CreateStockAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data['role'] == RoleStock.SUPER_ADMIN:
            return Response({'detail': 'Créer un super administrateur avec createsuperuser, pas depuis cette page.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(username=data['matricule'], password=data['password'], first_name=data.get('prenom', ''), last_name=data['nom'])
            personne = Personnel.objects.create(
                per_matricule=data['matricule'], per_nom=data['nom'], per_prenom=data.get('prenom', ''),
                per_date_naissance=data['date_naissance'], per_numero_cin=data['numero_cin'],
                per_date_embauche=data['date_embauche'], per_type_contrat=data['type_contrat'],
                per_fonction=data['fonction_id'], per_departement=data.get('departement_id'), per_user=user,
                per_created_by=request.user, per_updated_by=request.user,
            )
            StockProfil.objects.create(pst_personnel=personne, pst_role=data['role'])
        except IntegrityError:
            raise serializers.ValidationError({'detail': 'Matricule ou CIN déjà utilisé.'})
        return Response(StockAccountSerializer(personne).data, status=status.HTTP_201_CREATED)


class StockAccountDetailView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            personne = Personnel.objects.select_for_update().select_related('per_user', 'stock_profil').get(pk=pk, stock_profil__isnull=False)
        except Personnel.DoesNotExist:
            return Response({'detail': 'Compte introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not personne.per_user or personne.per_user.is_superuser:
            return Response({'detail': 'Ce compte ne peut pas être modifié ici.'}, status=status.HTTP_400_BAD_REQUEST)
        role = request.data.get('role')
        actif = request.data.get('actif')
        password = request.data.get('password')
        departement_id = request.data.get('departement_id')
        if departement_id is not None:
            if departement_id == '':
                personne.per_departement = None
            else:
                personne.per_departement = get_object_or_404(RhDepartement, pk=departement_id, dep_actif=True)
        if role is not None:
            if role not in dict(RoleStock.choices) or role == RoleStock.SUPER_ADMIN:
                raise serializers.ValidationError({'role': 'Rôle invalide.'})
            if role == RoleStock.CHEF_DEPARTEMENT and not personne.per_departement:
                raise serializers.ValidationError({'departement_id': 'Attribuez d’abord un département.'})
            personne.stock_profil.pst_role = role
        if actif is not None:
            if type(actif) is not bool:
                raise serializers.ValidationError({'actif': 'Une valeur booléenne est requise.'})
            personne.stock_profil.pst_actif = actif
            personne.per_user.is_active = actif
        if password is not None:
            if not isinstance(password, str) or len(password) < 8:
                raise serializers.ValidationError({'password': 'Au moins 8 caractères.'})
            check_stock_password(password, personne.per_user)
            personne.per_user.set_password(password)
        personne.stock_profil.save()
        personne.per_user.save()
        personne.per_updated_by = request.user
        personne.save(update_fields=['per_departement', 'per_updated_by', 'per_updated_at'])
        return Response(StockAccountSerializer(personne).data)
