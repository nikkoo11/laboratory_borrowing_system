from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from django.utils import timezone
from users.permissions import IsAdmin
from users.models import User
from staff.models import Staff
from inventory.models import Inventory
from .models import Transaction, Notification
from .serializers import TransactionSerializer
from .permissions import IsOwnerStaffOrAdmin, IsStaffOrAdmin

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
        # Borrowers always create requests for themselves. This avoids making
        # the browser submit a user ID and prevents impersonated requests.
        payload = request.data.copy()
        if request.user.role not in (User.Role.ADMIN, User.Role.STAFF):
            payload['user'] = request.user.pk

        serializer = TransactionSerializer(data=payload, context={'request': request})
        if not serializer.is_valid():
            return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item_id = serializer.validated_data.get('item_name')
        qty = serializer.validated_data.get('quantity', 1)
        if item_id and item_id.quantity < qty:
            return Response(
                data={'message': f'Insufficient stock: only {item_id.quantity} unit(s) available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            created_tx = serializer.save()
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

            # Safely build borrower full name
            full_name = f"{request.user.first_name} {request.user.last_name}".strip()
            borrower_name = full_name if full_name else request.user.username

            # Notify all Admin and Staff members about the new borrow request
            staff_and_admins = User.objects.filter(role__in=[User.Role.ADMIN, User.Role.STAFF])
            item_display_name = created_tx.item_name.item_name if hasattr(created_tx.item_name, 'item_name') else str(created_tx.item_name)

            notifications = [
                Notification(
                    recipient=admin_user,
                    transaction=created_tx,
                    title="New Borrow Request",
                    message=f"{borrower_name} requested to borrow {created_tx.quantity}x {item_display_name}."
                )
                for admin_user in staff_and_admins
            ]
            Notification.objects.bulk_create(notifications)

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

            if transaction.status != Transaction.PENDING:
                return Response(
                    data={'message': 'Only pending borrow requests can be edited.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            unsupported = [field for field in request.data if field not in ('item_name', 'quantity')]
            if unsupported:
                return Response(
                    data={'message': 'Only the equipment and quantity can be changed here. Use the approval or return actions to update status.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            prev_status = transaction.status
            serializer = TransactionSerializer(
                instance=transaction,
                data=request.data,
                context={'request': request},
                partial=True,
            )
            if not serializer.is_valid():
                return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_tx = serializer.save()
            if prev_status == Transaction.APPROVED and updated_tx.status == Transaction.RETURNED:
                inventory_item = Inventory.objects.select_for_update().get(pk=updated_tx.item_name_id)
                inventory_item.quantity += updated_tx.quantity
                if inventory_item.status == Inventory.UNAVAILABLE and inventory_item.quantity > 0:
                    inventory_item.status = Inventory.AVAILABLE
                inventory_item.save()

            if prev_status != updated_tx.status:
                item_name = updated_tx.item_name.item_name if hasattr(updated_tx.item_name, 'item_name') else "equipment"
                Notification.objects.create(
                    recipient=updated_tx.user,
                    transaction=updated_tx,
                    title=f"Borrow Status Updated: {updated_tx.status.capitalize()}",
                    message=f"Your request for {updated_tx.quantity}x {item_name} is now {updated_tx.status}."
                )

        return Response(data=TransactionSerializer(updated_tx).data)


class TransactionDelete(APIView):
    permission_classes = [IsOwnerStaffOrAdmin]

    def delete(self, request, pk):
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
            except Transaction.DoesNotExist:
                return Response(data={'message': 'Transaction does not exist.'}, status=status.HTTP_404_NOT_FOUND)
            self.check_object_permissions(request, transaction)
            is_admin = request.user.role == User.Role.ADMIN
            is_owner = transaction.user_id == request.user.pk
            if not is_admin and not is_owner:
                return Response(
                    data={'message': 'Only administrators or the borrower can delete this request.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not is_admin and transaction.status != Transaction.PENDING:
                return Response(
                    data={'message': 'Only pending borrow requests can be cancelled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if transaction.status in (Transaction.APPROVED, Transaction.RETURN_REQUESTED):
                return Response(
                    data={'message': 'Active loans cannot be deleted. Request and confirm the physical return first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
            if inventory_item.status != Inventory.AVAILABLE:
                return Response(
                    data={
                        'message': (
                            f'This equipment is currently {inventory_item.get_status_display().lower()} '
                            'and cannot be approved for borrowing.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
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

            inventory_item.quantity -= transaction.quantity
            if inventory_item.quantity == 0:
                inventory_item.status = Inventory.UNAVAILABLE
            inventory_item.save()

            # Notify borrower that request was approved
            item_name = transaction.item_name.item_name if hasattr(transaction.item_name, 'item_name') else "equipment"
            Notification.objects.create(
                recipient=transaction.user,
                transaction=transaction,
                title="Borrow Request Approved",
                message=f"Your request to borrow {transaction.quantity}x {item_name} has been approved."
            )

        return Response(TransactionSerializer(transaction).data)


class TransactionReturnRequest(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
            except Transaction.DoesNotExist:
                return Response(
                    data={'message': 'Transaction does not exist.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if transaction.user_id != request.user.pk:
                return Response(
                    data={'message': 'Only the borrower can request a return.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if transaction.status == Transaction.RETURN_REQUESTED:
                return Response(TransactionSerializer(transaction).data)
            if transaction.status != Transaction.APPROVED:
                return Response(
                    data={'message': 'Only active loans can have a return requested.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            transaction.status = Transaction.RETURN_REQUESTED
            transaction.save(update_fields=['status'])

            item_name = transaction.item_name.item_name
            recipients = User.objects.filter(role__in=[User.Role.ADMIN, User.Role.STAFF])
            notifications = [
                Notification(
                    recipient=recipient,
                    transaction=transaction,
                    title='Equipment Return Requested',
                    message=f'{transaction.user.username} requested to return {transaction.quantity}x {item_name}.',
                )
                for recipient in recipients
            ]
            Notification.objects.bulk_create(notifications)

        return Response(TransactionSerializer(transaction).data)


class TransactionReturn(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request, pk):
        with db_transaction.atomic():
            try:
                transaction = Transaction.objects.select_for_update().get(pk=pk)
            except Transaction.DoesNotExist:
                return Response(
                    data={'message': 'Transaction does not exist.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if transaction.status != Transaction.RETURN_REQUESTED:
                return Response(
                    data={'message': 'Only loans with a pending return request can be approved after physical inspection.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            inventory_item = Inventory.objects.select_for_update().get(pk=transaction.item_name_id)
            transaction.status = Transaction.RETURNED
            transaction.return_datetime = timezone.now()
            transaction.save(update_fields=['status', 'return_datetime'])

            inventory_item.quantity += transaction.quantity
            if inventory_item.status == Inventory.UNAVAILABLE and inventory_item.quantity > 0:
                inventory_item.status = Inventory.AVAILABLE
            inventory_item.save(update_fields=['quantity', 'status'])

            Notification.objects.create(
                recipient=transaction.user,
                transaction=transaction,
                title='Equipment Returned',
                message=f'Your return of {transaction.quantity}x {transaction.item_name.item_name} has been recorded.',
            )

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

        # Notify borrower that request was rejected
        item_name = transaction.item_name.item_name if hasattr(transaction.item_name, 'item_name') else "equipment"
        Notification.objects.create(
            recipient=transaction.user,
            transaction=transaction,
            title="Borrow Request Rejected",
            message=f"Your request to borrow {transaction.quantity}x {item_name} was rejected."
        )

        return Response(TransactionSerializer(transaction).data)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = request.user.notifications.all()[:20]
        data = [
            {
                "notification_id": n.notification_id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at,
                "transaction_id": n.transaction_id
            }
            for n in notifications
        ]
        return Response(data)

    def patch(self, request, pk=None):
        if pk:
            try:
                notif = request.user.notifications.get(pk=pk)
                notif.is_read = True
                notif.save()
            except Notification.DoesNotExist:
                return Response({'message': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({'message': 'Notifications updated.'})

    def delete(self, request, pk=None):
        if pk is None:
            deleted_count, _ = request.user.notifications.filter(is_read=True).delete()
            return Response({'deleted_count': deleted_count}, status=status.HTTP_200_OK)

        try:
            notification = request.user.notifications.get(pk=pk)
        except Notification.DoesNotExist:
            return Response(
                {'message': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
