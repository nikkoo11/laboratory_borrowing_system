from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
import binascii
import logging
import smtplib

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction as db_transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, remove_spaces
from .serializers import (
    UserSerializer, UserUpdateSerializer, UserRoleUpdateSerializer,
    CurrentUserSerializer, PasswordChangeSerializer, UserRegisterSerializer,
    PasswordResetConfirmSerializer,
)
from .permissions import IsAdmin, IsSelfOrAdmin

logger = logging.getLogger(__name__)


class UserRegister(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequest(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        email = request.data.get('email', '')
        if isinstance(email, str) and email.strip():
            users = User.objects.filter(email__iexact=email.strip(), is_active=True)
            if users.count() == 1:
                user = users.first()
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = (
                    f"{settings.FRONTEND_URL.rstrip('/')}/"
                    f"?reset_uid={uid}&token={token}"
                )
                try:
                    send_mail(
                        'Reset your CSU COEA Lab Borrowing System password',
                        f'Use this link to reset your password. It expires after '
                        f'{settings.PASSWORD_RESET_TIMEOUT // 60} minutes:\n\n{reset_url}\n\n'
                        'If you did not request this, you can ignore this email.',
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                except (OSError, smtplib.SMTPException):
                    logger.exception('Unable to send a password reset email.')
        return Response({
            'message': 'If an account matches that email, password reset instructions will be sent. If you do not receive an email, contact the administrator.'
        })


class PasswordResetConfirm(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        if (
            not isinstance(uid, str)
            or not uid
            or len(uid) > 64
            or not isinstance(token, str)
            or not token
            or len(token) > 256
        ):
            return Response(
                {'message': 'This password reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, binascii.Error, User.DoesNotExist):
            return Response(
                {'message': 'This password reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'message': 'This password reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PasswordResetConfirmSerializer(
            data=request.data,
            context={'user': user},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'message': 'Password reset successfully. You can now sign in.'})


class UserLogin(APIView):
    def post(self, request):
        username = remove_spaces(request.data.get('username'))
        password = remove_spaces(request.data.get('password'))
        user = authenticate(username=username, password=password)
        if user is None:
            return Response(data={'message': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response(data={
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class UserList(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            from transactions.permissions import IsStaffOrAdmin
            return [IsStaffOrAdmin()]
        return [IsAdmin()]

    def get(self, request):
        users = User.objects.all().order_by('user_id')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetail(APIView):
    permission_classes = [IsSelfOrAdmin]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(data={'message': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, user)
        serializer = UserSerializer(user)
        return Response(serializer.data)


class UserUpdate(APIView):
    permission_classes = [IsSelfOrAdmin]

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(data={'message': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, user)
        serializer = UserUpdateSerializer(instance=user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDelete(APIView):
    # Account deletion is an administrative action.  Administrators themselves
    # are protected so the system always retains its administrative accounts.
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(data={'message': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.role == User.Role.ADMIN:
            return Response(
                data={'message': 'Administrator accounts cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from transactions.models import Transaction
        has_active_loans = Transaction.objects.filter(
            user=user,
            status__in=[
                Transaction.APPROVED,
                Transaction.PENDING,
                Transaction.RETURN_REQUESTED,
            ],
        ).exists()
        if has_active_loans:
            return Response(
                data={'message': 'Cannot delete user account with active or pending equipment loans.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRoleUpdate(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        with db_transaction.atomic():
            admin_ids = list(
                User.objects.select_for_update()
                .filter(role=User.Role.ADMIN)
                .order_by('pk')
                .values_list('pk', flat=True)
            )
            try:
                user = User.objects.select_for_update().get(pk=pk)
            except User.DoesNotExist:
                return Response(
                    data={'message': 'User does not exist.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = UserRoleUpdateSerializer(
                instance=user, data=request.data, partial=True
            )
            if not serializer.is_valid():
                return Response(
                    data=serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                user.role == User.Role.ADMIN
                and serializer.validated_data.get('role', user.role) != User.Role.ADMIN
                and len(admin_ids) <= 1
            ):
                return Response(
                    data={'message': 'The last administrator cannot be demoted.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer.save()
            return Response(data=serializer.data)


class PasswordChange(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(data={'message': 'Password updated.'})
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserMe(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)    
