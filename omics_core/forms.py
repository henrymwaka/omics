from django import forms
from .models import Sample


class SampleUploadForm(forms.ModelForm):
    """
    Form for uploading a new sample with metadata.
    """
    class Meta:
        model = Sample
        fields = [
            "project",
            "sample_id",
            "organism",
            "tissue_type",
            "data_type",
            "collected_on",
        ]
        widgets = {
            "project": forms.Select(attrs={"class": "form-control"}),
            "sample_id": forms.TextInput(attrs={"class": "form-control", "placeholder": "Unique sample ID"}),
            "organism": forms.TextInput(attrs={"class": "form-control", "placeholder": "e.g., Musa acuminata"}),
            "tissue_type": forms.TextInput(attrs={"class": "form-control", "placeholder": "Leaf, root, etc."}),
            "data_type": forms.Select(attrs={"class": "form-select"}),
            "collected_on": forms.DateInput(attrs={"class": "form-control", "type": "date"}),
        }
