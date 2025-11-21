# users/urls.py
from django.urls import path
from .views import LoginView, CookieTokenRefreshView, LogoutView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh-cookie/", CookieTokenRefreshView.as_view(), name="auth-refresh-cookie"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
]
