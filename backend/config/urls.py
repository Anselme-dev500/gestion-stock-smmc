from django.contrib import admin
from django.urls import path, include
from core.views import MatriculeTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', MatriculeTokenObtainPairView.as_view(), name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api/stock/', include('stock.urls')),
]