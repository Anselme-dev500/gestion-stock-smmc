"""Tableau de bord et décisions du chef de département."""
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import RoleStock
from personnel.models import Personnel
from .models import Demande, NiveauValidation, StatutDemande, StatutValidation, Validation, JournalAudit

LEVELS = (NiveauValidation.DEPT_DEMANDEUR, NiveauValidation.RESPONSABLE_STOCK, NiveauValidation.DEPT_APPRO)


class ChefPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        person = getattr(user, 'user_personnel', None)
        if not person or not person.per_actif or not person.per_departement_id:
            return False
        profile = getattr(person, 'stock_profil', None)
        return bool(profile and profile.pst_actif and profile.pst_role == RoleStock.CHEF_DEPARTEMENT)


def is_appro(person):
    """Identifiant à configurer avec l'UUID réel du département Approvisionnement."""
    appro = getattr(settings, 'STOCK_APPRO_DEPARTEMENT_ID', None)
    return bool(appro and str(person.per_departement_id) == str(appro))


def scope(person):
    qs = Demande.objects.all() if is_appro(person) else Demande.objects.filter(
        dem_demandeur__per_departement_id=person.per_departement_id
    )
    return qs.select_related('dem_demandeur', 'dem_centre_responsabilite').prefetch_related('lignes__ldem_article', 'validations__val_validateur')


def next_level(demande):
    if demande.dem_statut in (StatutDemande.REFUSEE, StatutDemande.LIVREE):
        return None
    previous = list(demande.validations.order_by('val_date', 'val_id').values_list('val_niveau', 'val_statut'))
    for idx, (level, state) in enumerate(previous):
        if idx >= len(LEVELS) or level != LEVELS[idx] or state != StatutValidation.VALIDEE:
            return None
    return LEVELS[len(previous)] if len(previous) < len(LEVELS) else None


def can_decide(person, demande):
    level = next_level(demande)
    if level == NiveauValidation.DEPT_DEMANDEUR:
        return demande.dem_demandeur.per_departement_id == person.per_departement_id and demande.dem_demandeur_id != person.per_id
    if level == NiveauValidation.DEPT_APPRO:
        return is_appro(person)
    return False


def as_dict(demande, person):
    level = next_level(demande)
    return {
        'id': str(demande.pk), 'numero': demande.dem_numero,
        'date': demande.dem_date, 'type': demande.dem_type, 'statut': demande.dem_statut,
        'motif': demande.dem_motif, 'direction': demande.dem_direction,
        'centre': demande.dem_centre_responsabilite.cr_nom,
        'demandeur': str(demande.dem_demandeur),
        'prochaine_etape': level, 'peut_decider': can_decide(person, demande),
        'lignes': [
            {'id': str(l.pk), 'article': str(l.ldem_article), 'quantite_demandee': l.ldem_quantite_demandee, 'quantite_accordee': l.ldem_quantite_accordee}
            for l in demande.lignes.all()
        ],
        'validations': [
            {'niveau': v.val_niveau, 'statut': v.val_statut, 'date': v.val_date, 'validateur': str(v.val_validateur), 'commentaire': v.val_commentaire}
            for v in demande.validations.all()
        ],
    }


class ChefDashboardView(APIView):
    permission_classes = (IsAuthenticated, ChefPermission)

    def get(self, request):
        person = request.user.user_personnel
        demandes = list(scope(person).order_by('-dem_date'))
        pending = [d for d in demandes if can_decide(person, d)]
        return Response({
            'profil': {'nom': str(person), 'matricule': person.per_matricule, 'departement': person.per_departement.dep_nom if person.per_departement else '', 'approvisionnement': is_appro(person)},
            'stats': {'total': len(demandes), 'a_valider': len(pending), 'validees': sum(any(v.val_validateur_id == person.per_id and v.val_statut == StatutValidation.VALIDEE for v in d.validations.all()) for d in demandes), 'refusees': sum(d.dem_statut == StatutDemande.REFUSEE for d in demandes)},
            'demandes': [as_dict(d, person) for d in demandes],
        })


class ChefDecisionView(APIView):
    permission_classes = (IsAuthenticated, ChefPermission)

    @transaction.atomic
    def post(self, request, pk):
        person = request.user.user_personnel
        demande = get_object_or_404(Demande.objects.select_for_update(), pk=pk)
        if not scope(person).filter(pk=pk).exists():
            return Response({'detail': 'Demande inaccessible.'}, status=status.HTTP_403_FORBIDDEN)
        level = next_level(demande)
        if not can_decide(person, demande):
            return Response({'detail': 'Cette demande ne peut pas être traitée par votre département à cette étape.'}, status=status.HTTP_403_FORBIDDEN)
        action = request.data.get('action')
        commentaire = str(request.data.get('commentaire') or '').strip()
        if action not in ('valider', 'refuser'):
            raise serializers.ValidationError({'action': 'Choisir valider ou refuser.'})
        if action == 'refuser' and not commentaire:
            raise serializers.ValidationError({'commentaire': 'Motif obligatoire pour un refus.'})
        etat = StatutValidation.VALIDEE if action == 'valider' else StatutValidation.REFUSEE
        Validation.objects.create(val_demande=demande, val_niveau=level, val_statut=etat, val_validateur=person, val_commentaire=commentaire)
        demande.dem_statut = StatutDemande.REFUSEE if action == 'refuser' else StatutDemande.EN_COURS
        demande.save(update_fields=['dem_statut'])
        JournalAudit.enregistrer_action(person, 'decision_chef_departement', f'{demande.dem_numero}: {level} {etat}')
        return Response(as_dict(demande, person))
