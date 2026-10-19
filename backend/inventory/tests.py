from rest_framework import status
from rest_framework.test import APITestCase

from category.models import Category
from users.models import User
from .models import Inventory
from transactions.models import Notification, Transaction


class InventoryDeleteTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='inventory_admin',
            password='AdminPass123',
            first_name='Inventory',
            last_name='Admin',
            department='Lab',
            role=User.Role.ADMIN,
        )
        self.borrower = User.objects.create_user(
            username='inventory_borrower',
            password='StudentPass123',
            first_name='Lab',
            last_name='Borrower',
            department='Science',
        )
        category = Category.objects.create(category_name='Glassware')
        self.item = Inventory.objects.create(
            item_name='Beaker',
            quantity=4,
            category=category,
            location='Shelf A',
        )
        response = self.client.post(
            '/api/login/',
            {'username': 'inventory_admin', 'password': 'AdminPass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_admin_can_delete_equipment_without_borrow_history(self):
        response = self.client.delete(f'/api/inventory/{self.item.item_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Inventory.objects.filter(pk=self.item.item_id).exists())

    def test_admin_cannot_delete_equipment_with_borrow_history(self):
        transaction = Transaction.objects.create(
            item_name=self.item,
            user=self.borrower,
            quantity=1,
            status=Transaction.RETURNED,
        )
        response = self.client.delete(f'/api/inventory/{self.item.item_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Inventory.objects.filter(pk=self.item.item_id).exists())
        self.assertTrue(Transaction.objects.filter(pk=transaction.transaction_id).exists())

    def test_status_change_notifies_borrowers_with_active_or_pending_requests(self):
        transactions = [
            Transaction.objects.create(
                item_name=self.item,
                user=self.borrower,
                quantity=1,
                status=transaction_status,
            )
            for transaction_status in (
                Transaction.PENDING,
                Transaction.APPROVED,
                Transaction.RETURN_REQUESTED,
                Transaction.RETURNED,
            )
        ]

        response = self.client.put(
            f'/api/inventory/{self.item.item_id}/update/',
            {'status': Inventory.MAINTENANCE},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(
                title='Borrowed Equipment Availability Updated',
                message__contains='under maintenance',
            ).count(),
            3,
        )
        notified_transactions = set(Notification.objects.values_list('transaction_id', flat=True))
        self.assertEqual(
            notified_transactions,
            {tx.transaction_id for tx in transactions[:3]},
        )

        response = self.client.put(
            f'/api/inventory/{self.item.item_id}/update/',
            {'status': Inventory.UNAVAILABLE},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(
                title='Borrowed Equipment Availability Updated',
                message__contains='unavailable',
            ).count(),
            3,
        )

    def test_equipment_detail_edit_notifies_borrowers_with_active_requests(self):
        transaction = Transaction.objects.create(
            item_name=self.item,
            user=self.borrower,
            quantity=1,
            status=Transaction.APPROVED,
        )

        response = self.client.put(
            f'/api/inventory/{self.item.item_id}/update/',
            {'location': 'Shelf B'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification = Notification.objects.get(transaction=transaction)
        self.assertEqual(notification.title, 'Borrowed Equipment Updated')
        self.assertIn('Details for Beaker', notification.message)
