from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin
from users.models import User
from .models import Transaction
from .serializers import TransactionSerializer
from .permissions import IsOwnerStaffOrAdmin, IsStaffOrAdmin

# Fields only STAFF/ADMIN are allowed to set via TransactionUpdate.
STAFF_ONLY_FIELDS = ('approver', 'return_datetime')


class TransactionList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role in (User.Role.ADMIN, User.Role.STAFF):
            transactions = Transaction.objects.all().order_by('-transaction_id')
        else:
            transactions = Transaction.objects.filter(user=request.user).order_by('-transaction_id')
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class TransactionCreate(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetail(APIView):
    permission_classes = [IsOwnerStaffOrAdmin]

    def get(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, transaction)
        serializer = TransactionSerializer(transaction)
        return Response(serializer.data)


class TransactionUpdate(APIView):
    permission_classes = [IsOwnerStaffOrAdmin]

    def put(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, transaction)

        is_staff_or_admin = request.user.role in (User.Role.ADMIN, User.Role.STAFF)
        if not is_staff_or_admin:
            attempted = [f for f in STAFF_ONLY_FIELDS if f in request.data]
            if attempted:
                return Response(
                    data={'message': f"Only staff or admin can set: {', '.join(attempted)}."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = TransactionSerializer(instance=transaction, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDelete(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        transaction.delete()
        return Response(data={'message': 'Transaction deleted.'}, status=status.HTTP_204_NO_CONTENT)