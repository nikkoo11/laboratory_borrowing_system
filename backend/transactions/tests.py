from rest_framework import status
from rest_framework.test import APITestCase

from category.models import Category
from inventory.models import Inventory
from staff.models import Staff
from users.models import User
from .models import Notification, Transaction


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
            'quantity': 1,
            'status': Transaction.APPROVED,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Transaction.PENDING)
        self.assertIsNone(response.data['approver'])
        self.assertEqual(response.data['user'], self.student.user_id)

    def test_student_cannot_approve_own_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.PENDING)

    def test_student_can_cancel_own_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.delete(f'/api/transactions/{tx.transaction_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Transaction.objects.filter(pk=tx.transaction_id).exists())

    def test_student_cannot_cancel_another_users_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        User.objects.create_user(
            username='student2', password='StudentPass123',
            first_name='Alex', last_name='Learner', department='IT',
        )
        self.login_as('student2', 'StudentPass123')
        response = self.client.delete(f'/api/transactions/{tx.transaction_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Transaction.objects.filter(pk=tx.transaction_id).exists())

    def test_student_cannot_cancel_approved_loan(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.APPROVED,
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.delete(f'/api/transactions/{tx.transaction_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Transaction.objects.filter(pk=tx.transaction_id).exists())

    def test_admin_cannot_delete_approved_loan_to_restore_stock(self):
        self.item.quantity = 3
        self.item.save()
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=2, status=Transaction.APPROVED,
        )
        self.login_as('admin1', 'AdminPass123')

        response = self.client.delete(f'/api/transactions/{tx.transaction_id}/delete/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Transaction.objects.filter(pk=tx.transaction_id).exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)

    def test_admin_cannot_delete_return_request_before_physical_inspection(self):
        self.item.quantity = 3
        self.item.save()
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=2,
            status=Transaction.RETURN_REQUESTED,
        )
        self.login_as('admin1', 'AdminPass123')

        response = self.client.delete(f'/api/transactions/{tx.transaction_id}/delete/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Transaction.objects.filter(pk=tx.transaction_id).exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)

    def test_student_can_edit_own_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/transactions/{tx.transaction_id}/update/',
            {'item_name': self.item.item_id, 'quantity': 3},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tx.refresh_from_db()
        self.assertEqual(tx.user_id, self.student.user_id)
        self.assertEqual(tx.quantity, 3)

    def test_student_cannot_change_borrower_on_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        other_student = User.objects.create_user(
            username='student2', password='StudentPass123',
            first_name='Alex', last_name='Learner', department='IT',
        )
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/transactions/{tx.transaction_id}/update/',
            {'user': other_student.user_id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.assertEqual(tx.user_id, self.student.user_id)

    def test_staff_cannot_approve_by_editing_status_directly(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('staff1', 'StaffPass123')
        response = self.client.put(
            f'/api/transactions/{tx.transaction_id}/update/',
            {'status': Transaction.APPROVED},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(tx.status, Transaction.PENDING)
        self.assertEqual(self.item.quantity, 5)

    def test_staff_can_approve_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.login_as('staff1', 'StaffPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.APPROVED)
        self.assertEqual(response.data['approver'], self.staff.staff_id)

    def test_admin_can_approve_pending_request(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=2, status=Transaction.PENDING,
        )
        self.login_as('admin1', 'AdminPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.APPROVED)
        self.assertIsNotNone(response.data['approver'])
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)

    def test_admin_cannot_approve_request_when_equipment_is_unavailable(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.PENDING,
        )
        self.item.status = Inventory.MAINTENANCE
        self.item.save()
        self.login_as('admin1', 'AdminPass123')

        response = self.client.post(f'/api/transactions/{tx.transaction_id}/approve/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('under maintenance', response.data['message'])
        tx.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(tx.status, Transaction.PENDING)
        self.assertEqual(self.item.quantity, 5)

    def test_student_can_request_return_without_restoring_inventory(self):
        self.item.quantity = 3
        self.item.save()
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=2, status=Transaction.APPROVED,
        )
        self.login_as('student1', 'StudentPass123')

        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return-request/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.RETURN_REQUESTED)
        first_notification_count = Notification.objects.filter(
            transaction=tx,
            title='Equipment Return Requested',
        ).count()
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)
        self.assertTrue(Notification.objects.filter(
            recipient=self.admin, transaction=tx, title='Equipment Return Requested',
        ).exists())
        self.assertTrue(Notification.objects.filter(
            recipient=self.staff_user, transaction=tx, title='Equipment Return Requested',
        ).exists())
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return-request/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.RETURN_REQUESTED)
        self.assertEqual(
            Notification.objects.filter(
                transaction=tx,
                title='Equipment Return Requested',
            ).count(),
            first_notification_count,
        )
        self.login_as('admin1', 'AdminPass123')
        notifications = self.client.get('/api/notifications/')
        self.assertEqual(notifications.status_code, status.HTTP_200_OK)
        self.assertTrue(any(
            notification['transaction_id'] == tx.transaction_id
            and notification['title'] == 'Equipment Return Requested'
            for notification in notifications.data
        ))

    def test_student_cannot_request_return_for_another_borrowers_loan(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.APPROVED,
        )
        another_student = User.objects.create_user(
            username='student2', password='StudentPass123',
            first_name='Alex', last_name='Learner', department='IT',
        )
        self.login_as('student2', 'StudentPass123')

        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return-request/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.APPROVED)

    def test_borrower_cannot_confirm_return_or_bypass_admin_inspection(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1,
            status=Transaction.RETURN_REQUESTED,
        )
        self.login_as('student1', 'StudentPass123')

        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        tx.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(tx.status, Transaction.RETURN_REQUESTED)
        self.assertEqual(self.item.quantity, 5)

    def test_admin_can_confirm_requested_return_and_stock_is_restored_once(self):
        self.item.quantity = 3
        self.item.save()
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=2, status=Transaction.RETURN_REQUESTED,
        )
        self.login_as('admin1', 'AdminPass123')

        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.RETURNED)
        self.assertIsNotNone(response.data['return_datetime'])
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 5)

        tx.refresh_from_db()
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 5)

    def test_complete_borrow_and_return_approval_flow_restores_stock_once(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.post(
            '/api/transactions/create/',
            {'item_name': self.item.item_id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        transaction_id = response.data['transaction_id']
        self.assertEqual(response.data['status'], Transaction.PENDING)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 5)

        self.login_as('admin1', 'AdminPass123')
        response = self.client.post(f'/api/transactions/{transaction_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.APPROVED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)

        self.login_as('student1', 'StudentPass123')
        response = self.client.post(f'/api/transactions/{transaction_id}/return-request/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.RETURN_REQUESTED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)

        self.login_as('admin1', 'AdminPass123')
        notification_response = self.client.get('/api/notifications/')
        self.assertTrue(any(
            notification['transaction_id'] == transaction_id
            and notification['title'] == 'Equipment Return Requested'
            for notification in notification_response.data
        ))
        response = self.client.post(f'/api/transactions/{transaction_id}/return/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Transaction.RETURNED)
        self.assertIsNotNone(response.data['return_datetime'])
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 5)

    def test_user_can_delete_own_notification(self):
        notification = Notification.objects.create(
            recipient=self.student,
            title='Test notification',
            message='This notification can be deleted.',
        )
        self.login_as('student1', 'StudentPass123')

        response = self.client.delete(f'/api/notifications/{notification.pk}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(pk=notification.pk).exists())

    def test_user_cannot_delete_another_users_notification(self):
        notification = Notification.objects.create(
            recipient=self.student,
            title='Test notification',
            message='This belongs to another user.',
        )
        self.login_as('admin1', 'AdminPass123')

        response = self.client.delete(f'/api/notifications/{notification.pk}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Notification.objects.filter(pk=notification.pk).exists())

    def test_delete_all_notifications_preserves_unread(self):
        read_notification = Notification.objects.create(
            recipient=self.student,
            title='Read notification',
            message='This read notification should be deleted.',
            is_read=True,
        )
        unread_notification = Notification.objects.create(
            recipient=self.student,
            title='Unread notification',
            message='This unread notification should remain.',
            is_read=False,
        )
        other_user_notification = Notification.objects.create(
            recipient=self.staff_user,
            title='Other user notification',
            message='This belongs to someone else.',
            is_read=True,
        )
        self.login_as('student1', 'StudentPass123')

        response = self.client.delete('/api/notifications/read/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deleted_count'], 1)
        self.assertFalse(Notification.objects.filter(pk=read_notification.pk).exists())
        self.assertTrue(Notification.objects.filter(pk=unread_notification.pk).exists())
        self.assertTrue(Notification.objects.filter(pk=other_user_notification.pk).exists())

    def test_admin_cannot_confirm_return_before_borrower_requests_it(self):
        tx = Transaction.objects.create(
            item_name=self.item, user=self.student, quantity=1, status=Transaction.APPROVED,
        )
        self.login_as('admin1', 'AdminPass123')
        response = self.client.post(f'/api/transactions/{tx.transaction_id}/return/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        tx.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(tx.status, Transaction.APPROVED)
        self.assertEqual(self.item.quantity, 5)

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
