from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import (
    UserSerializer, UserUpdateSerializer, UserRoleUpdateSerializer,
    CurrentUserSerializer, PasswordChangeSerializer,
)
from .permissions import IsAdmin, IsSelfOrAdmin


class UserRegister(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLogin(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
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
    permission_classes = [IsSelfOrAdmin]

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(data={'message': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, user)

        from transactions.models import Transaction
        has_active_loans = Transaction.objects.filter(
            user=user,
            status__in=[Transaction.APPROVED, Transaction.PENDING]
        ).exists()
        if has_active_loans:
            return Response(
                data={'message': 'Cannot delete user account with active or pending equipment loans.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(data={'message': 'User deleted.'}, status=status.HTTP_204_NO_CONTENT)


class UserRoleUpdate(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(data={'message': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserRoleUpdateSerializer(instance=user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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