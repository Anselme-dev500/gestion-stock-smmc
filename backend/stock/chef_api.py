"""API sécurisée de l'espace Chef de département.

Les vues génériques de demandes restent réservées aux traitements globaux.
Cet endpoint limite strictement un chef aux demandes de son département et
enregistre chaque décision dans l'historique ``Validation``.
"""

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import RoleStock
from personnel.models import Personnel
from rh_service.models import RhService

from .models import (
    Demande,
    NiveauValidation,
    StatutDemande,
    StatutValidation,
    Validation,
)


VALIDATION_LEVELS = (
    NiveauValidation.DEPT_DEMANDEUR,
    NiveauValidation.RESPONSABLE_STOCK,
    NiveauValidation.DEPT_APPRO,
)


def personnel_for(user):
    try:
        return user.user_personnel
    except Personnel.DoesNotExist:
        return None


class IsChefDepartement(BasePermission):
    """Only an active Stock profile with the department-chief role may enter."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_superuser:
            return True
        person = personnel_for(user)
        profile = getattr(person, "stock_profil", None) if person else None
        return bool(
            person
            and person.per_actif
            and person.per_departement_id
            and profile
            and profile.pst_actif
            and profile.pst_role == RoleStock.CHEF_DEPARTEMENT
        )


def is_approvisionnement(person):
    """Optional final approval department, configured with an environment value."""
    department_id = getattr(settings, "STOCK_APPRO_DEPARTEMENT_ID", None)
    return bool(department_id and str(person.per_departement_id) == str(department_id))


def demandes_accessibles(person):
    queryset = Demande.objects.all() if is_approvisionnement(person) else Demande.objects.filter(
        dem_demandeur__per_departement_id=person.per_departement_id
    )
    return queryset.select_related(
        "dem_demandeur", "dem_centre_responsabilite"
    ).prefetch_related(
        "lignes__ldem_article", "validations__val_validateur", "pieces_jointes"
    )


def prochaine_etape(demande):
    if demande.dem_statut in (StatutDemande.REFUSEE, StatutDemande.LIVREE):
        return None
    previous = list(
        demande.validations.order_by("val_date", "val_id").values_list(
            "val_niveau", "val_statut"
        )
    )
    for index, (niveau, statut) in enumerate(previous):
        if index >= len(VALIDATION_LEVELS):
            return None
        if niveau != VALIDATION_LEVELS[index] or statut != StatutValidation.VALIDEE:
            return None
    return VALIDATION_LEVELS[len(previous)] if len(previous) < len(VALIDATION_LEVELS) else None


def peut_decider(person, demande):
    niveau = prochaine_etape(demande)
    if niveau == NiveauValidation.DEPT_DEMANDEUR:
        # A chief cannot validate a request that they created themselves.
        return (
            demande.dem_demandeur.per_departement_id == person.per_departement_id
            and demande.dem_demandeur_id != person.per_id
        )
    if niveau == NiveauValidation.DEPT_APPRO:
        return is_approvisionnement(person)
    return False


def serialiser_demande(demande, person):
    return {
        "id": str(demande.pk),
        "numero": demande.dem_numero,
        "date": demande.dem_date,
        "type": demande.dem_type,
        "statut": demande.dem_statut,
        "motif": demande.dem_motif,
        "direction": demande.dem_direction,
        "centre": str(demande.dem_centre_responsabilite),
        "demandeur": str(demande.dem_demandeur),
        "prochaine_etape": prochaine_etape(demande),
        "peut_decider": peut_decider(person, demande),
        "traitee_par_moi": any(
            validation.val_validateur_id == person.per_id
            for validation in demande.validations.all()
        ),
        "lignes": [
            {
                "id": str(line.pk),
                "code_article": line.ldem_article.art_code_article,
                "designation": line.ldem_article.art_designation,
                "unite": line.ldem_article.art_unite,
                "quantite_demandee": line.ldem_quantite_demandee,
                "quantite_disponible": line.ldem_article.art_quantite_stock,
                "quantite_accordee": line.ldem_quantite_accordee,
                "remarque": line.ldem_remarque,
            }
            for line in demande.lignes.all()
        ],
        "validations": [
            {
                "niveau": validation.val_niveau,
                "statut": validation.val_statut,
                "date": validation.val_date,
                "validateur": str(validation.val_validateur),
                "commentaire": validation.val_commentaire,
            }
            for validation in demande.validations.all()
        ],
        "pieces_jointes": [
            {"id": str(piece.pk), "nom": piece.pj_nom_fichier, "url": piece.pj_fichier.url}
            for piece in demande.pieces_jointes.all()
            if piece.pj_fichier
        ],
    }


class ChefDashboardView(APIView):
    permission_classes = (IsAuthenticated, IsChefDepartement)

    def get(self, request):
        person = personnel_for(request.user)
        demandes = list(demandes_accessibles(person).order_by("-dem_date"))
        en_attente = [demande for demande in demandes if peut_decider(person, demande)]
        return Response(
            {
                "profil": {
                    "nom": str(person),
                    "matricule": person.per_matricule,
                    "departement": str(person.per_departement),
                    "approvisionnement": is_approvisionnement(person),
                },
                "stats": {
                    "total": len(demandes),
                    "a_valider": len(en_attente),
                    "validees": sum(
                        any(
                            validation.val_validateur_id == person.per_id
                            and validation.val_statut == StatutValidation.VALIDEE
                            for validation in demande.validations.all()
                        )
                        for demande in demandes
                    ),
                    "refusees": sum(
                        demande.dem_statut == StatutDemande.REFUSEE
                        for demande in demandes
                    ),
                    "urgentes": sum(demande.dem_type == "urgence" for demande in demandes),
                },
                "demandes": [serialiser_demande(demande, person) for demande in demandes],
                "services": [
                    {
                        "id": str(service.pk),
                        "nom": service.ser_nom,
                        "nom_court": service.ser_nom_court,
                        "description": service.ser_description,
                    }
                    for service in RhService.objects.filter(
                        ser_departement_id=person.per_departement_id,
                        ser_actif=True,
                    ).order_by("ser_nom")
                ],
            }
        )


class ChefDecisionView(APIView):
    permission_classes = (IsAuthenticated, IsChefDepartement)

    @transaction.atomic
    def post(self, request, pk):
        person = personnel_for(request.user)
        demande = get_object_or_404(
            demandes_accessibles(person).select_for_update(), pk=pk
        )
        if not peut_decider(person, demande):
            return Response(
                {"detail": "Cette demande ne peut pas être traitée à cette étape."},
                status=status.HTTP_403_FORBIDDEN,
            )

        action = request.data.get("action")
        commentaire = str(request.data.get("commentaire") or "").strip()
        if action not in ("valider", "refuser"):
            raise serializers.ValidationError({"action": "Choisissez valider ou refuser."})
        if action == "refuser" and not commentaire:
            raise serializers.ValidationError({"commentaire": "Le motif du refus est obligatoire."})

        niveau = prochaine_etape(demande)
        statut = (
            StatutValidation.VALIDEE if action == "valider" else StatutValidation.REFUSEE
        )
        Validation.enregistrer(demande, niveau, person, statut, commentaire)
        demande.refresh_from_db()
        demande = demandes_accessibles(person).get(pk=demande.pk)
        return Response(serialiser_demande(demande, person))
