from rest_framework import status
from rest_framework.test import APITestCase

from category.models import Category
from inventory.models import Inventory
from staff.models import Staff
from users.models import User
from .models import Transaction


class TransactionApprovalTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='AdminPass123',
            first_name='Ada', last_name='Admin', department='IT',
            role=User.Role.ADMIN,
        )
        self.staff_user = User.objects.create_user(
            username='staff1', password='StaffPass123',
            first_name='Sue', last_name='Staff', department='Lab',
            role=User.Role.STAFF,
        )
        self.staff = Staff.objects.create(user=self.staff_user, position='Custodian')
        self.student = User.objects.create_user(
            username='student1', password='StudentPass123',
            first_name='Sam', last_name='Student', department='CpE',
        )
        self.category = Category.objects.create(category_name='Meters')
        self.item = Inventory.objects.create(
            item_name='Multimeter',
            quantity=5,
            category=self.category,
            location='Cabinet A1',
        )

    def login_as(self, username, password):
        response = self.client.post(
            '/api/login/', {'username': username, 'password': password}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_student_borrow_is_pending_not_approved(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.post('/api/transactions/create/', {
            'item_name': self.item.item_id,
            'user': self.student.user_id,
            'quantity': 1,
            'status': Transaction.APPROVED,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Transaction.PENDING)
        self.assertIsNone(response.data['approver'])

    def test_student_cannot_approve_own_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.PENDING)

    def test_staff_can_approve_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('staff1', 'StaffPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.APPROVED)
        self.assertEqual(response.data['approver'], self.staff.staff_id)

    def test_staff_can_reject_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('admin1', 'AdminPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/reject/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.REJECTED)

    def test_staff_recorded_loan_is_approved(self):
        self.login_as('staff1', 'StaffPass123')
        response = self.client.post('/api/transactions/create/', {
            'item_name': self.item.item_id,
            'user': self.student.user_id,
            'quantity': 1,
            'approver': self.staff.staff_id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Transaction.APPROVED)
