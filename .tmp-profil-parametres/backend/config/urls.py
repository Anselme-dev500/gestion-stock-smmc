from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from core.views import SMMCLoginView
from rest_framework_simplejwt.views import TokenRefreshView
from core.token_lifetime import StockRefreshSerializer


class StockRefreshView(TokenRefreshView):
    serializer_class = StockRefreshSerializer


urlpatterns = [
    path("admin/", admin.site.urls),

    # Authentification JWT
    path(
        "api/auth/login/",
        SMMCLoginView.as_view(),
        name="login",
    ),

    path(
        "api/auth/refresh/",
        StockRefreshView.as_view(),
        name="token_refresh",
    ),

    path("api/", include("core.urls")),

    path("api/stock/chef/", include("stock.chef_urls")),

    # API Stock
    path(
        "api/stock/",
        include("stock.urls"),
    ),
] + (static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) if settings.DEBUG else [])
