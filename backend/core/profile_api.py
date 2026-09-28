from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from personnel.models import Personnel
from stock.models import JournalAudit

DEFAULT_PREFERENCES = {"theme": "clair", "format_date": "jj/mm/aaaa", "lignes_tableau": 20, "stock_faible": True, "demandes": True, "mouvements": True, "inventaires": True, "notification_interne": True, "notification_email": False}

def person(user):
    try: return Personnel.objects.select_related("per_fonction", "per_service", "per_departement", "stock_profil").get(per_user=user)
    except Personnel.DoesNotExist: raise serializers.ValidationError({"detail": "Aucune fiche Personnel liée à ce compte."})

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        p = person(request.user); events = JournalAudit.objects.filter(aud_personnel=p).order_by("-aud_date")[:10]
        return Response({"matricule": p.per_matricule, "nom": p.per_nom, "prenom": p.per_prenom or "", "telephone": p.per_telephone_perso or "", "email": p.per_email_perso or "", "adresse": p.per_adresse_personnelle or "", "photo": request.build_absolute_uri(p.per_photo.url) if p.per_photo else None, "fonction": str(p.per_fonction or ""), "service": str(p.per_service or ""), "departement": str(p.per_departement or ""), "role": getattr(getattr(p, "stock_profil", None), "pst_role", ""), "actif": bool(p.per_actif and request.user.is_active), "derniere_connexion": request.user.last_login, "activites": [{"id": str(e.aud_id), "action": e.aud_action, "details": e.aud_details, "date": e.aud_date} for e in events]})
    def patch(self, request):
        allowed = {"telephone": "per_telephone_perso", "email": "per_email_perso", "adresse": "per_adresse_personnelle"}
        if not request.data or set(request.data) - set(allowed): raise serializers.ValidationError({"detail": "Champs autorisés : téléphone, email, adresse."})
        p = person(request.user)
        for key, attr in allowed.items():
            if key in request.data:
                value = str(request.data[key]).strip()
                if key == "email" and value:
                    try: validate_email(value)
                    except DjangoValidationError: raise serializers.ValidationError({"email": "Adresse email invalide."})
                setattr(p, attr, value)
        p.per_updated_by = request.user; p.save(); JournalAudit.enregistrer_action(p, "profil_modifie", "Coordonnées mises à jour")
        return self.get(request)

class PasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        old, new = request.data.get("ancien_mot_de_passe"), request.data.get("nouveau_mot_de_passe")
        if not isinstance(old, str) or not request.user.check_password(old): raise serializers.ValidationError({"ancien_mot_de_passe": "Mot de passe actuel incorrect."})
        try: validate_password(new, request.user)
        except DjangoValidationError as exc: raise serializers.ValidationError({"nouveau_mot_de_passe": exc.messages})
        request.user.set_password(new); request.user.save(update_fields=["password"]); return Response({"detail": "Mot de passe modifié. Reconnectez-vous."})

class PhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request):
        photo = request.FILES.get("photo")
        if not photo or photo.size > 2 * 1024 * 1024:
            raise serializers.ValidationError({"photo": "Image PNG, JPEG ou WebP requise (2 Mo maximum)."})
        if photo.content_type not in ("image/png", "image/jpeg", "image/webp"):
            raise serializers.ValidationError({"photo": "Format PNG, JPEG ou WebP attendu."})
        p = person(request.user); p.per_photo = photo; p.per_updated_by = request.user; p.save()
        JournalAudit.enregistrer_action(p, "photo_profil_modifiee", "Photo de profil mise à jour")
        return Response({"photo": request.build_absolute_uri(p.per_photo.url)})

class PreferencesView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        metadata = person(request.user).per_metadata or {}; return Response({**DEFAULT_PREFERENCES, **metadata.get("stock_preferences", {})})
    def patch(self, request):
        if not request.data or set(request.data) - set(DEFAULT_PREFERENCES): raise serializers.ValidationError({"detail": "Préférence inconnue."})
        p = person(request.user); metadata = dict(p.per_metadata or {}); metadata["stock_preferences"] = {**DEFAULT_PREFERENCES, **metadata.get("stock_preferences", {}), **request.data}; p.per_metadata = metadata; p.per_updated_by = request.user; p.save(); return self.get(request)
