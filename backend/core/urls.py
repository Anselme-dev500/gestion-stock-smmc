from django.urls import path
from .admin_api import AdminLoginView, StockAccountsView, StockAccountDetailView
from .profile_api import ProfileView, PasswordView, PreferencesView, PhotoView
from .settings_api import SettingsView, AuditView, BackupView

urlpatterns = [
    path('account/profile/', ProfileView.as_view()),
    path('account/password/', PasswordView.as_view()),
    path('account/photo/', PhotoView.as_view()),
    path('account/preferences/', PreferencesView.as_view()),
    path('admin/settings/', SettingsView.as_view()),
    path('admin/audit/', AuditView.as_view()),
    path('admin/backup/', BackupView.as_view()),
    path('auth/admin-login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/stock-users/', StockAccountsView.as_view(), name='stock-users'),
    path('admin/stock-users/<uuid:pk>/', StockAccountDetailView.as_view(), name='stock-user-detail'),
]
