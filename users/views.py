# users/views.py
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def set_auth_cookies(response, access_token, refresh_token=None):
    """
    Attach JWT tokens as HTTP only cookies on the response.
    """
    max_age_access = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    max_age_refresh = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    if access_token:
        response.set_cookie(
            settings.AUTH_COOKIE,
            access_token,
            max_age=max_age_access,
            secure=settings.AUTH_COOKIE_SECURE,
            httponly=settings.AUTH_COOKIE_HTTP_ONLY,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )

    if refresh_token:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            refresh_token,
            max_age=max_age_refresh,
            secure=settings.AUTH_COOKIE_SECURE,
            httponly=settings.AUTH_COOKIE_HTTP_ONLY,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )


def clear_auth_cookies(response):
    """
    Remove JWT cookies on logout.
    """
    response.delete_cookie(settings.AUTH_COOKIE)
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH)


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(TokenObtainPairView):
    """
    POST username, password
    Sets access and refresh tokens as HTTP only cookies.
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            data = response.data
            access = data.get("access")
            refresh = data.get("refresh")

            # Remove raw tokens from JSON body, keep only a simple message
            response.data = {"detail": "Login successful"}

            set_auth_cookies(response, access, refresh)

        return response


@method_decorator(csrf_exempt, name="dispatch")
class CookieTokenRefreshView(TokenRefreshView):
    """
    Uses the refresh token from cookie to issue a new access token.
    """

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)

        if refresh_token is None:
            return Response(
                {"detail": "No refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh_token})

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0])

        access = serializer.validated_data["access"]

        response = Response({"detail": "Token refreshed"}, status=status.HTTP_200_OK)
        set_auth_cookies(response, access_token=access, refresh_token=None)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    """
    Clears JWT cookies.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        response = Response({"detail": "Logged out"}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    """
    Returns basic profile info for the currently authenticated user.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user: User = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )
