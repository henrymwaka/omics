# omics_core/auth.py
#
# Authentication endpoints for ResLab Omics Platform.
# Implements:
#   - /api/auth/login/
#   - /api/auth/logout/
#   - /api/auth/me/
#
# Uses Django session cookies for authentication.
# CSRF is exempted for login to allow API access from frontend.

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Disable CSRF for API login


# ============================================================
# /api/auth/login/
# ============================================================
class LoginView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"detail": "Missing credentials"}, status=400)

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"detail": "Invalid username or password"}, status=401)

        login(request, user)
        return Response({"detail": "Login successful", "username": user.username})


# ============================================================
# /api/auth/logout/
# ============================================================
class LogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out"})


# ============================================================
# /api/auth/me/
# ============================================================
class MeView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"authenticated": False}, status=401)

        user = request.user
        return Response({
            "authenticated": True,
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })
