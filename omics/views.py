# omics/views.py
from django.views.generic import TemplateView
from django.shortcuts import render
from django.utils import timezone


class LandingView(TemplateView):
    """
    Main landing page for omics.reslab.dev.
    Serves as the entry point for the ResLab Omics Platform,
    linking to the data dashboard, API documentation, and help resources.
    """
    template_name = "landing.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx.update({
            "page_title": "ResLab Omics Platform",
            "welcome": "Welcome to the ResLab Omics Data Portal",
            "description": (
                "The ResLab Omics Platform provides tools for managing sequencing projects, "
                "sample metadata, and analytical results. Access the dashboard to create projects, "
                "upload sample files, or explore datasets via the REST API."
            ),
            "sections": [
                {"name": "Dashboard", "url": "/dashboard/", "icon": "📊"},
                {"name": "API Docs", "url": "/api/docs/", "icon": "🧭"},
                {"name": "Data Browser", "url": "/core/projects/", "icon": "🧬"},
                {"name": "Admin", "url": "/admin/", "icon": "⚙️"},
            ],
            "last_updated": timezone.now(),
        })
        return ctx


def custom_404(request, exception):
    """User-friendly 404 error page."""
    return render(request, "404.html", status=404)


def custom_500(request):
    """User-friendly 500 error page."""
    return render(request, "500.html", status=500)
