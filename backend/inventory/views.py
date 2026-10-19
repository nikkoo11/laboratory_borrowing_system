from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from users.permissions import IsAdmin
from .models import Inventory
from .serializers import InventorySerializer
from transactions.models import Notification, Transaction


class InventoryList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = Inventory.objects.all()
        serializer = InventorySerializer(items, many=True)
        return Response(serializer.data)


class InventoryCreate(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = InventorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            item = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response(data={'message': 'Item does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = InventorySerializer(item)
        return Response(serializer.data)


class InventoryUpdate(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        with db_transaction.atomic():
            try:
                item = Inventory.objects.select_for_update().get(pk=pk)
            except Inventory.DoesNotExist:
                return Response(data={'message': 'Item does not exist.'}, status=status.HTTP_404_NOT_FOUND)

            previous_values = {
                'item_name': item.item_name,
                'quantity': item.quantity,
                'category_id': item.category_id,
                'location': item.location,
                'status': item.status,
            }
            serializer = InventorySerializer(item, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_fields = {
                field for field, value in serializer.validated_data.items()
                if previous_values['category_id' if field == 'category' else field]
                != (value.pk if field == 'category' else value)
            }
            updated_item = serializer.save()

            if updated_fields:
                affected_transactions = Transaction.objects.filter(
                    item_name=updated_item,
                    status__in=(
                        Transaction.PENDING,
                        Transaction.APPROVED,
                        Transaction.RETURN_REQUESTED,
                    ),
                ).select_related('user')
                availability_changed = (
                    'status' in updated_fields
                    and updated_item.status in (Inventory.UNAVAILABLE, Inventory.MAINTENANCE)
                )
                for affected_transaction in affected_transactions:
                    if availability_changed:
                        item_status = updated_item.get_status_display().lower()
                        message = (
                            f'{updated_item.item_name} associated with your borrowing request or loan '
                            f'is now marked '
                            f'{item_status}. Please contact laboratory staff for assistance.'
                        )
                        title = 'Borrowed Equipment Availability Updated'
                    else:
                        message = (
                            f'Details for {updated_item.item_name}, associated with your borrowing '
                            'request or loan, were updated by laboratory staff.'
                        )
                        title = 'Borrowed Equipment Updated'
                    Notification.objects.create(
                        recipient=affected_transaction.user,
                        transaction=affected_transaction,
                        title=title,
                        message=message,
                    )

        return Response(data=serializer.data, status=status.HTTP_200_OK)


class InventoryDelete(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            item = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response(data={'message': 'Item does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        if Transaction.objects.filter(item_name=item).exists():
            return Response(
                data={'message': 'Cannot delete equipment with borrowing history. Update its status instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.delete()
        return Response(data={'message': 'Item deleted.'}, status=status.HTTP_200_OK)