from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self):
        """
        Ensure default role groups exist.

        Groups:
          - Omics Admin
          - Omics Manager
          - Omics Analyst
          - Omics Viewer
        """
        from django.contrib.auth.models import Group
        from django.db.utils import OperationalError, ProgrammingError

        default_groups = [
            "Omics Admin",
            "Omics Manager",
            "Omics Analyst",
            "Omics Viewer",
        ]

        try:
            for name in default_groups:
                Group.objects.get_or_create(name=name)
        except (OperationalError, ProgrammingError):
            # Database not ready during migrations or first setup
            pass
