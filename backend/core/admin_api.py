"""API d'administration du module Stock. Réservée au superutilisateur Django."""
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from personnel.models import Personnel
from rh_fonction.models import RhFonction
from .models import RoleStock, StockProfil


class SuperuserOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.is_superuser)


class AdminTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_superuser or not self.user.is_active:
            raise serializers.ValidationError('Accès réservé au super administrateur.')
        data['username'] = self.user.username
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
    password = serializers.CharField(min_length=8, write_only=True, trim_whitespace=False)

    def validate_matricule(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ce matricule est déjà associé à un compte utilisateur.')
        return value

    def validate(self, attrs):
        """Autorise l'association d'une fiche Personnel existante sans compte."""
        existing_person = Personnel.objects.filter(
            per_matricule=attrs['matricule']
        ).first()
        cin_owner = Personnel.objects.filter(
            per_numero_cin=attrs['numero_cin']
        ).exclude(per_matricule=attrs['matricule']).exists()

        if cin_owner:
            raise serializers.ValidationError('Ce numéro CIN existe déjà.')
        if existing_person and (
            existing_person.per_user_id or
            StockProfil.objects.filter(pst_personnel=existing_person).exists()
        ):
            raise serializers.ValidationError({
                'matricule': 'Cette fiche Personnel possède déjà un compte ou un profil Stock.'
            })
        return attrs


class StockAccountsView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]

    def get(self, request):
        people = Personnel.objects.filter(stock_profil__isnull=False).select_related('per_user', 'stock_profil').order_by('per_nom')
        functions = RhFonction.objects.filter(fn_actif=True).order_by('fn_nom').values('fn_id', 'fn_nom')
        return Response({'users': StockAccountSerializer(people, many=True).data, 'fonctions': list(functions), 'roles': [{'value': key, 'label': label} for key, label in RoleStock.choices]})

    @transaction.atomic
    def post(self, request):
        serializer = CreateStockAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data['role'] == RoleStock.SUPER_ADMIN:
            return Response({'detail': 'Créer un super administrateur avec createsuperuser, pas depuis cette page.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(username=data['matricule'], password=data['password'], first_name=data.get('prenom', ''), last_name=data['nom'])
            personne = Personnel.objects.select_for_update().filter(
                per_matricule=data['matricule']
            ).first()
            if personne:
                # Fiche créée dans le module RH : on conserve son historique
                # et on lui ajoute seulement le compte et le rôle Stock.
                personne.per_user = user
                personne.per_fonction = data['fonction_id']
                personne.per_updated_by = request.user
                personne.save(update_fields=[
                    'per_user', 'per_fonction', 'per_updated_by', 'per_updated_at'
                ])
            else:
                personne = Personnel.objects.create(
                    per_matricule=data['matricule'], per_nom=data['nom'], per_prenom=data.get('prenom', ''),
                    per_date_naissance=data['date_naissance'], per_numero_cin=data['numero_cin'],
                    per_date_embauche=data['date_embauche'], per_type_contrat=data['type_contrat'],
                    per_fonction=data['fonction_id'], per_user=user,
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
        if role is not None:
            if role not in dict(RoleStock.choices) or role == RoleStock.SUPER_ADMIN:
                raise serializers.ValidationError({'role': 'Rôle invalide.'})
            personne.stock_profil.pst_role = role
        if actif is not None:
            if type(actif) is not bool:
                raise serializers.ValidationError({'actif': 'Une valeur booléenne est requise.'})
            personne.stock_profil.pst_actif = actif
            personne.per_user.is_active = actif
        if password is not None:
            if not isinstance(password, str) or len(password) < 8:
                raise serializers.ValidationError({'password': 'Au moins 8 caractères.'})
            personne.per_user.set_password(password)
        personne.stock_profil.save()
        personne.per_user.save()
        personne.per_updated_by = request.user
        personne.save(update_fields=['per_updated_by', 'per_updated_at'])
        return Response(StockAccountSerializer(personne).data)
