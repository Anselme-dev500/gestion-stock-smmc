from django.urls import path
from .chef_api import ChefDashboardView, ChefDecisionView
urlpatterns = [
    path('tableau-de-bord/', ChefDashboardView.as_view(), name='chef-tableau-de-bord'),
    path('demandes/<uuid:pk>/decision/', ChefDecisionView.as_view(), name='chef-decision'),
]
