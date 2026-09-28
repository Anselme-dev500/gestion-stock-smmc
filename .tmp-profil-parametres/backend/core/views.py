from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import SMMCLoginSerializer


class SMMCLoginView(TokenObtainPairView):
    serializer_class = SMMCLoginSerializer
