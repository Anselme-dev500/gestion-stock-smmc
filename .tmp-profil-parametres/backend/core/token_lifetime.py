from datetime import timedelta
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from .models import StockConfiguration, default_stock_settings


def session_duration():
    data = StockConfiguration.objects.filter(pk=1).values_list("valeurs", flat=True).first() or default_stock_settings()
    return timedelta(minutes=data.get("duree_session_minutes", 60))


def access_with_duration(refresh):
    access = refresh.access_token
    access.set_exp(lifetime=session_duration())
    return str(access)


class StockRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        result = super().validate(attrs)
        refresh = RefreshToken(attrs["refresh"])
        result["access"] = access_with_duration(refresh)
        return result
