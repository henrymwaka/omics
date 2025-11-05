from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from .models import Project, Sample
from .forms import SampleUploadForm


def project_list(request):
    projects = Project.objects.all().order_by("-created_at")
    return render(request, "omics_core/project_list.html", {"projects": projects})


def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    return render(request, "omics_core/project_detail.html", {"project": project})


def sample_detail(request, pk):
    sample = get_object_or_404(Sample, pk=pk)
    return render(request, "omics_core/sample_detail.html", {"sample": sample})


def upload_sample(request):
    """
    Upload metadata for a new biological sample.
    """
    if request.method == "POST":
        form = SampleUploadForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Sample record added successfully.")
            return redirect("project_list")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = SampleUploadForm()

    return render(request, "omics_core/upload.html", {"form": form})
