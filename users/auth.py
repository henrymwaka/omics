# users/auth.py
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
  """
  JWT auth that first tries Authorization header.
  If missing, it falls back to an access token stored
  in an HTTP only cookie.
  """

  def authenticate(self, request):
      # First try normal header based auth
      header = self.get_header(request)
      if header is not None:
          return super().authenticate(request)

      # Fallback to cookie based token
      raw_token = request.COOKIES.get(settings.AUTH_COOKIE)
      if raw_token is None:
          return None

      validated_token = self.get_validated_token(raw_token)
      return self.get_user(validated_token), validated_token
