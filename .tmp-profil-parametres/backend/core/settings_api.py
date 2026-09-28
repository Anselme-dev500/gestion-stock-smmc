"""Réglages globaux du stock, accessibles aux seuls superutilisateurs Django."""
import re
from django.http import HttpResponse
from django.core import serializers as django_serializers
from django.db import transaction
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from stock.models import JournalAudit
from personnel.models import Personnel
from .admin_api import SuperuserOnly
from .models import StockConfiguration, default_stock_settings


class StockSettingsView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        value = StockConfiguration.objects.filter(pk=1).values_list("valeurs", flat=True).first()
        return Response({**default_stock_settings(), **(value or {})})

    def patch(self, request):
        defaults = default_stock_settings()
        if not request.data or set(request.data) - defaults.keys():
            raise serializers.ValidationError({"detail": "Paramètre inconnu ou requête vide."})
        for key, val in request.data.items():
            if key in ("seuil_defaut", "duree_session_minutes", "longueur_mot_de_passe"):
                bounds = {"seuil_defaut": (0, 100000), "duree_session_minutes": (5, 480), "longueur_mot_de_passe": (8, 128)}[key]
                if type(val) is not int or not bounds[0] <= val <= bounds[1]: raise serializers.ValidationError({key: "Valeur hors limites."})
            elif key == "prefixes":
                if not isinstance(val, dict) or set(val) != set(defaults["prefixes"]) or any(not isinstance(v, str) or not re.fullmatch(r"[A-Z]{2,8}", v) for v in val.values()) or len(set(val.values())) != len(val):
                    raise serializers.ValidationError({key: "Six préfixes distincts de 2 à 8 lettres majuscules requis."})
            elif key == "devise" and val not in ("MGA", "EUR", "USD"): raise serializers.ValidationError({key: "Devise invalide."})
            elif key == "format_rapport" and val not in ("pdf", "csv", "xlsx"): raise serializers.ValidationError({key: "Format invalide."})
        with transaction.atomic():
            conf, _ = StockConfiguration.objects.select_for_update().get_or_create(pk=1)
            conf.valeurs = {**defaults, **conf.valeurs, **request.data}
            conf.save(update_fields=["valeurs", "updated_at"])
            p = Personnel.objects.filter(per_user=request.user).first()
            JournalAudit.enregistrer_action(p, "configuration_modifiee", ", ".join(request.data.keys()))
        return Response(conf.valeurs)


class AuditView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        events = JournalAudit.objects.select_related("aud_personnel").order_by("-aud_date")[:100]
        return Response([{"id": str(e.pk), "date": e.aud_date, "action": e.aud_action, "details": e.aud_details, "matricule": e.aud_personnel.per_matricule if e.aud_personnel else "Système"} for e in events])


class BackupView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        """Export de données métiers; restaurer hors ligne avec loaddata et un administrateur BD."""
        from django.apps import apps
        from django.utils import timezone
        models = list(apps.get_app_config("stock").get_models()) + [StockConfiguration]
        rows = []
        for model in models:
            rows.extend(list(model.objects.all()))
        content = django_serializers.serialize("json", rows, indent=2)
        response = HttpResponse(content, content_type="application/json; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="smmc-stock-{timezone.now():%Y%m%d-%H%M%S}.json"'
        response["Cache-Control"] = "no-store"
        return response
