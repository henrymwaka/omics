# ===============================================================
# omics_core/urls.py
# Core routes for ResLab Omics Platform
# ===============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Project pages
    path("", views.project_list, name="project_list"),
    path("projects/<int:pk>/", views.project_detail, name="project_detail"),

    # Sample pages
    path("samples/<int:pk>/", views.sample_detail, name="sample_detail"),
    path("upload/", views.upload_sample, name="upload_sample"),  # ✅ NEW
]
