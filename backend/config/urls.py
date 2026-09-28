from django.contrib import admin
from django.urls import path, include

from core.views import SMMCLoginView
from rest_framework_simplejwt.views import TokenRefreshView


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
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path("api/", include("core.urls")),

    # API Stock
    path(
        "api/stock/",
        include("stock.urls"),
    ),
]