from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from users.permissions import IsAdmin
from users.models import User
from staff.models import Staff
from inventory.models import Inventory
from .models import Transaction
from .serializers import TransactionSerializer
from .permissions import IsOwnerStaffOrAdmin, IsStaffOrAdmin

# Fields only STAFF/ADMIN are allowed to set via TransactionUpdate.
STAFF_ONLY_FIELDS = ('approver', 'return_datetime', 'status')


def _staff_for(user):
    if user.role not in (User.Role.ADMIN, User.Role.STAFF):
        return None
    staff, _ = Staff.objects.get_or_create(
        user=user,
        defaults={'position': 'Laboratory Staff' if user.role == User.Role.STAFF else 'Laboratory Administrator'}
    )
    return staff


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
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Validate that apparatus exists with sufficient quantity
        item_id = serializer.validated_data.get('item_name')
        qty = serializer.validated_data.get('quantity', 1)
        if item_id and item_id.quantity < qty:
            return Response(
                data={'message': f'Insufficient stock: only {item_id.quantity} unit(s) available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            created_tx = serializer.save()
            # Deduct inventory only when the transaction is immediately approved (admin/staff path)
            if created_tx.status == Transaction.APPROVED:
                inventory_item = Inventory.objects.select_for_update().get(pk=created_tx.item_name_id)
                if inventory_item.quantity < created_tx.quantity:
                    return Response(
                        data={'message': f'Insufficient stock: only {inventory_item.quantity} unit(s) available.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                inventory_item.quantity -= created_tx.quantity
                if inventory_item.quantity == 0:
                    inventory_item.status = Inventory.UNAVAILABLE
                inventory_item.save()

        return Response(data=TransactionSerializer(created_tx).data, status=status.HTTP_201_CREATED)


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
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
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

            prev_status = transaction.status
            serializer = TransactionSerializer(
                instance=transaction,
                data=request.data,
                context={'request': request},
            )
            if not serializer.is_valid():
                return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_tx = serializer.save()
            # Restore inventory quantity safely only when transitioning from APPROVED to RETURNED
            if prev_status == Transaction.APPROVED and updated_tx.status == Transaction.RETURNED:
                inventory_item = Inventory.objects.select_for_update().get(pk=updated_tx.item_name_id)
                inventory_item.quantity += updated_tx.quantity
                if inventory_item.status == Inventory.UNAVAILABLE and inventory_item.quantity > 0:
                    inventory_item.status = Inventory.AVAILABLE
                inventory_item.save()

        return Response(data=TransactionSerializer(updated_tx).data)


class TransactionDelete(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
            except Transaction.DoesNotExist:
                return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
            if transaction.status == Transaction.APPROVED:
                inventory_item = Inventory.objects.select_for_update().get(pk=transaction.item_name_id)
                inventory_item.quantity += transaction.quantity
                if inventory_item.status == Inventory.UNAVAILABLE and inventory_item.quantity > 0:
                    inventory_item.status = Inventory.AVAILABLE
                inventory_item.save()
            transaction.delete()
        return Response(data={'message': 'Transaction deleted.'}, status=status.HTTP_200_OK)


class TransactionApprove(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request, pk):
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
            except Transaction.DoesNotExist:
                return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)

            if transaction.status != Transaction.PENDING:
                return Response(
                    data={'message': 'Only pending requests can be approved.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            inventory_item = Inventory.objects.select_for_update().get(pk=transaction.item_name_id)
            if inventory_item.quantity < transaction.quantity:
                return Response(
                    data={'message': f'Insufficient stock: only {inventory_item.quantity} unit(s) available.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            staff = _staff_for(request.user)
            if staff:
                transaction.approver = staff
            transaction.status = Transaction.APPROVED
            transaction.save()

            # Deduct inventory stock now that the request is officially approved
            inventory_item.quantity -= transaction.quantity
            if inventory_item.quantity == 0:
                inventory_item.status = 'unavailable'
            inventory_item.save()

        return Response(TransactionSerializer(transaction).data)


class TransactionReject(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        if transaction.status != Transaction.PENDING:
            return Response(
                data={'message': 'Only pending requests can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        staff = _staff_for(request.user)
        if staff:
            transaction.approver = staff
        transaction.status = Transaction.REJECTED
        transaction.save()
        return Response(TransactionSerializer(transaction).data)
