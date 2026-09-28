import re
from django.core import serializers as django_serializers
from django.http import HttpResponse
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from stock.models import JournalAudit
from .admin_api import SuperuserOnly
from .models import StockConfiguration, default_stock_settings

class SettingsView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        conf, _ = StockConfiguration.objects.get_or_create(pk=1)
        return Response({**default_stock_settings(), **conf.valeurs})
    def patch(self, request):
        defaults = default_stock_settings()
        if not request.data or set(request.data) - set(defaults): raise serializers.ValidationError({"detail": "Paramètre inconnu."})
        values = {**defaults, **request.data}
        if not isinstance(values["seuil_defaut"], int) or values["seuil_defaut"] < 0: raise serializers.ValidationError({"seuil_defaut": "Valeur invalide."})
        if not isinstance(values["longueur_mot_de_passe"], int) or not 8 <= values["longueur_mot_de_passe"] <= 128: raise serializers.ValidationError({"longueur_mot_de_passe": "Entre 8 et 128."})
        if not isinstance(values["duree_session_minutes"], int) or not 5 <= values["duree_session_minutes"] <= 480: raise serializers.ValidationError({"duree_session_minutes": "Entre 5 et 480."})
        if not isinstance(values["prefixes"], dict) or set(values["prefixes"]) != set(defaults["prefixes"]) or any(not isinstance(v,str) or not re.fullmatch(r"[A-Z]{2,8}",v) for v in values["prefixes"].values()): raise serializers.ValidationError({"prefixes": "Préfixes majuscules de 2 à 8 caractères requis."})
        conf, _ = StockConfiguration.objects.get_or_create(pk=1); conf.valeurs = values; conf.save(); return Response(values)

class AuditView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        return Response([{"id":str(x.aud_id),"date":x.aud_date,"action":x.aud_action,"details":x.aud_details,"personnel":str(x.aud_personnel or "Système")} for x in JournalAudit.objects.select_related("aud_personnel").order_by("-aud_date")[:100]])

class BackupView(APIView):
    permission_classes = [IsAuthenticated, SuperuserOnly]
    def get(self, request):
        from django.apps import apps
        rows=[]
        for model in list(apps.get_app_config("stock").get_models())+[StockConfiguration]: rows.extend(model.objects.all())
        response=HttpResponse(django_serializers.serialize("json",rows,indent=2),content_type="application/json")
        response["Content-Disposition"]='attachment; filename="smmc-stock-backup.json"'; response["Cache-Control"]="no-store"; return response
