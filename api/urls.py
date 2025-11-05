from rest_framework import routers
from django.urls import path, include
from .views import ProjectViewSet, SampleViewSet, OmicsFileViewSet

router = routers.DefaultRouter()
router.register(r"projects", ProjectViewSet)
router.register(r"samples", SampleViewSet)
router.register(r"files", OmicsFileViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
