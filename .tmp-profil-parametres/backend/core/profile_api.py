"""Compte personnel du module Stock ; aucune donnée RH sensible n'est modifiable ici."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from personnel.models import Personnel
from stock.models import Article, JournalAudit
from .models import StockConfiguration, default_stock_settings


DEFAULT_PREFERENCES = {
    "theme": "clair", "format_date": "jj/mm/aaaa", "lignes_tableau": 20,
    "stock_faible": True, "demandes": True, "mouvements": True, "inventaires": True,
    "notification_interne": True, "notification_email": False,
}


def personnel_for(user):
    try:
        return Personnel.objects.select_related("per_fonction", "per_departement", "per_service", "per_user").get(per_user=user)
    except Personnel.DoesNotExist:
        raise serializers.ValidationError({"detail": "Aucune fiche Personnel liée à ce compte."})


def preferences(personne):
    metadata = personne.per_metadata if isinstance(personne.per_metadata, dict) else {}
    stored = metadata.get("stock_preferences", {})
    return {**DEFAULT_PREFERENCES, **(stored if isinstance(stored, dict) else {})}


def audit(personne, action, details=""):
    JournalAudit.enregistrer_action(personne, action, details)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        p = personnel_for(request.user)
        actions = JournalAudit.objects.filter(aud_personnel=p).order_by("-aud_date")[:10]
        return Response({
            "matricule": p.per_matricule, "nom": p.per_nom, "prenom": p.per_prenom,
            "telephone": p.per_telephone_perso or "", "email": p.per_email_perso or "",
            "adresse": p.per_adresse_personnelle or "",
            "photo": request.build_absolute_uri(p.per_photo.url) if p.per_photo else None,
            "fonction": p.per_fonction.fn_nom if p.per_fonction else "",
            "departement": p.per_departement.dep_nom if p.per_departement else "",
            "service": p.per_service.ser_nom if p.per_service else "",
            "role": getattr(getattr(p, "stock_profil", None), "pst_role", ""),
            "actif": bool(request.user.is_active and p.per_actif),
            "derniere_connexion": request.user.last_login,
            "activites": [{"id": str(a.aud_id), "action": a.aud_action, "details": a.aud_details, "date": a.aud_date} for a in actions],
        })

    def patch(self, request):
        fields = {"telephone": ("per_telephone_perso", 20), "email": ("per_email_perso", 150), "adresse": ("per_adresse_personnelle", 100)}
        if not request.data or set(request.data) - fields.keys():
            raise serializers.ValidationError({"detail": "Champs autorisés : téléphone, email, adresse."})
        with transaction.atomic():
            p = personnel_for(request.user)
            changed = []
            for key, (attr, limit) in fields.items():
                if key in request.data:
                    value = request.data[key]
                    if not isinstance(value, str) or len(value.strip()) > limit:
                        raise serializers.ValidationError({key: f"Texte de 0 à {limit} caractères attendu."})
                    if key == "email" and value.strip():
                        try: validate_email(value.strip())
                        except DjangoValidationError: raise serializers.ValidationError({"email": "Adresse email invalide."})
                    setattr(p, attr, value.strip()); changed.append(attr)
            p.per_updated_by = request.user
            p.save(update_fields=changed + ["per_updated_by", "per_updated_at"])
            audit(p, "profil_modifie", "Coordonnées mises à jour")
        return self.get(request)


class PhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request):
        photo = request.FILES.get("photo")
        if not photo or photo.size > 2 * 1024 * 1024:
            raise serializers.ValidationError({"photo": "Image requise, taille maximale 2 Mo."})
        from PIL import Image, UnidentifiedImageError
        try:
            img = Image.open(photo); img.verify(); photo.seek(0)
            if img.format not in ("PNG", "JPEG", "WEBP"):
                raise ValueError()
        except (UnidentifiedImageError, ValueError, OSError):
            raise serializers.ValidationError({"photo": "Format PNG, JPEG ou WebP attendu."})
        p = personnel_for(request.user)
        p.per_photo = photo; p.per_updated_by = request.user
        p.save(update_fields=["per_photo", "per_updated_by", "per_updated_at"])
        audit(p, "photo_profil_modifiee")
        return Response({"photo": request.build_absolute_uri(p.per_photo.url)})


class PasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        old, new = request.data.get("ancien_mot_de_passe"), request.data.get("nouveau_mot_de_passe")
        if not isinstance(old, str) or not request.user.check_password(old):
            raise serializers.ValidationError({"ancien_mot_de_passe": "Mot de passe actuel incorrect."})
        minimum = StockConfiguration.objects.filter(pk=1).values_list("valeurs", flat=True).first() or default_stock_settings()
        if not isinstance(new, str) or len(new) < minimum.get("longueur_mot_de_passe", 8):
            raise serializers.ValidationError({"nouveau_mot_de_passe": "Mot de passe trop court."})
        try: validate_password(new, request.user)
        except DjangoValidationError as exc: raise serializers.ValidationError({"nouveau_mot_de_passe": exc.messages})
        request.user.set_password(new); request.user.save(update_fields=["password"])
        try: audit(personnel_for(request.user), "mot_de_passe_modifie")
        except serializers.ValidationError: pass
        return Response({"detail": "Mot de passe modifié. Reconnectez-vous."})


class PreferencesView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response(preferences(personnel_for(request.user)))
    def patch(self, request):
        if not request.data or set(request.data) - DEFAULT_PREFERENCES.keys():
            raise serializers.ValidationError({"detail": "Préférence inconnue ou requête vide."})
        for key, val in request.data.items():
            valid = (type(val) is bool if isinstance(DEFAULT_PREFERENCES[key], bool) else
                     type(val) is int and val in (10, 20, 50, 100) if key == "lignes_tableau" else
                     val in ("clair", "sombre") if key == "theme" else
                     val in ("jj/mm/aaaa", "aaaa-mm-jj"))
            if not valid: raise serializers.ValidationError({key: "Valeur invalide."})
        with transaction.atomic():
            p = Personnel.objects.select_for_update().get(per_user=request.user)
            metadata = dict(p.per_metadata or {})
            metadata["stock_preferences"] = {**preferences(p), **request.data}
            p.per_metadata = metadata; p.per_updated_by = request.user
            p.save(update_fields=["per_metadata", "per_updated_by", "per_updated_at"])
            audit(p, "preferences_modifiees")
        return Response(preferences(p))


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        p = personnel_for(request.user); prefs = preferences(p)
        if not prefs["notification_interne"]: return Response({"count": 0, "results": []})
        results = []
        if prefs["stock_faible"] and (request.user.is_superuser or getattr(getattr(p, "stock_profil", None), "pst_role", "") == "responsable_stock"):
            for article in Article.objects.filter(art_quantite_stock__lt=F("art_seuil_min")).order_by("art_quantite_stock")[:10]:
                if article.est_en_alerte():
                    results.append({"id": str(article.pk), "type": "warning", "title": "Stock faible", "message": article.art_designation, "created_at": timezone.now(), "link": "/etat-stock"})
        categories = []
        if prefs["demandes"]: categories.append("demande")
        if prefs["mouvements"]: categories.extend(["entree", "sortie", "retour", "dotation"])
        if prefs["inventaires"]: categories.append("inventaire")
        if categories:
            actions = JournalAudit.objects.filter(aud_personnel=p, aud_action__iregex="|".join(categories)).order_by("-aud_date")[:10]
            for a in actions:
                results.append({"id": str(a.pk), "type": "info", "title": a.aud_action.replace("_", " ").capitalize(), "message": a.aud_details or "Activité du stock", "created_at": a.aud_date, "link": "/chef/historique" if getattr(getattr(p, "stock_profil", None), "pst_role", "") == "chef_departement" else "/mouvements"})
        return Response({"count": len(results), "results": results})
