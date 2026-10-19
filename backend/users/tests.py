from rest_framework import status
from rest_framework.test import APITestCase
from django.core import mail
from django.test import override_settings

from category.models import Category
from inventory.models import Inventory
from transactions.models import Transaction
from .models import User


class UserAPITests(APITestCase):
    """Backend checks for the users app. Run with: python manage.py test users"""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='AdminPass123',
            first_name='Ada', last_name='Admin', department='IT',
            role=User.Role.ADMIN,
        )
        self.student = User.objects.create_user(
            username='student1', password='StudentPass123',
            first_name='Sam', last_name='Student', department='CpE',
        )
        self.other = User.objects.create_user(
            username='student2', password='OtherPass123',
            first_name='Olive', last_name='Other', department='CpE',
        )

    # ---------- helpers ----------

    def login_as(self, username, password):
        response = self.client.post(
            '/api/login/', {'username': username, 'password': password}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def profile_payload(self, **overrides):
        payload = {'first_name': 'New', 'last_name': 'Name', 'department': 'ECE'}
        payload.update(overrides)
        return payload

    def register_payload(self, **overrides):
        payload = {
            'username': 'newbie', 'password': 'NewbiePass123',
            'email': 'NEWBIE@EXAMPLE.COM',
            'first_name': 'New', 'last_name': 'Bie',
            'user_type': 'student', 'department': 'CpE',
        }
        payload.update(overrides)
        return payload

    # ---------- register and login ----------

    def test_register_is_open_and_creates_viewer_with_hashed_password(self):
        response = self.client.post(
            '/api/register/',
            self.register_payload(username='new bie', password='Newbie Pass123'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', response.data)
        user = User.objects.get(username='newbie')
        self.assertEqual(user.email, 'newbie@example.com')
        self.assertEqual(user.username, 'newbie')
        self.assertEqual(user.role, User.Role.VIEWER)
        self.assertNotEqual(user.password, 'Newbie Pass123')
        self.assertTrue(user.check_password('NewbiePass123'))

    def test_register_cannot_set_role(self):
        response = self.client.post(
            '/api/register/', self.register_payload(role='ADMIN'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(username='newbie').role, User.Role.VIEWER)

    def test_register_requires_password(self):
        payload = self.register_payload()
        del payload['password']
        response = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_requires_email(self):
        payload = self.register_payload()
        del payload['email']
        response = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_email_already_used_with_different_case(self):
        self.student.email = 'student@example.com'
        self.student.save(update_fields=['email'])
        response = self.client.post(
            '/api/register/',
            self.register_payload(email='STUDENT@example.com'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_wrong_password_is_rejected(self):
        response = self.client.post(
            '/api/login/', {'username': 'student1', 'password': 'nope'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_ignores_spaces_in_username_and_password(self):
        response = self.client.post(
            '/api/login/',
            {'username': 'stu dent1', 'password': 'Student Pass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ---------- /api/me/ ----------

    def test_me_requires_login(self):
        response = self.client.get('/api/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_own_details_including_role(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.get('/api/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin1')
        self.assertEqual(response.data['role'], 'ADMIN')
        self.assertNotIn('password', response.data)

        self.login_as('student1', 'StudentPass123')
        response = self.client.get('/api/me/')
        self.assertEqual(response.data['username'], 'student1')
        self.assertEqual(response.data['role'], 'VIEWER')

    # ---------- roles ----------

    def test_admin_role_sets_django_flags_and_demotion_clears_them(self):
        self.assertTrue(self.admin.is_staff)
        self.assertTrue(self.admin.is_superuser)
        self.admin.role = User.Role.STAFF
        self.admin.save()
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_staff)
        self.assertFalse(self.admin.is_superuser)

    def test_user_list_is_admin_only(self):
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.login_as('student1', 'StudentPass123')
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.login_as('admin1', 'AdminPass123')
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_admin_can_change_a_role(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.patch(
            f'/api/users/{self.student.pk}/role/', {'role': 'STAFF'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, User.Role.STAFF)

    def test_admin_cannot_demote_the_last_administrator(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.patch(
            f'/api/users/{self.admin.pk}/role/',
            {'role': User.Role.STAFF},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, User.Role.ADMIN)

    def test_invalid_role_is_rejected(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.patch(
            f'/api/users/{self.student.pk}/role/', {'role': 'SUPERHERO'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_change_any_role(self):
        self.login_as('student1', 'StudentPass123')
        for target in (self.student, self.other):
            response = self.client.patch(
                f'/api/users/{target.pk}/role/', {'role': 'ADMIN'}, format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            target.refresh_from_db()
            self.assertEqual(target.role, User.Role.VIEWER)

    # ---------- profile update ----------

    def test_user_can_update_own_profile_without_touching_password(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/users/{self.student.pk}/update/', self.profile_payload(), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.first_name, 'New')
        self.assertEqual(self.student.department, 'ECE')
        self.assertTrue(self.student.check_password('StudentPass123'))

    def test_user_cannot_update_someone_else(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/users/{self.other.pk}/update/', self.profile_payload(), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.other.refresh_from_db()
        self.assertEqual(self.other.first_name, 'Olive')

    def test_non_admin_cannot_change_own_user_type(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/users/{self.student.pk}/update/',
            self.profile_payload(user_type='faculty'), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.student.refresh_from_db()
        self.assertEqual(self.student.user_type, User.STUDENT)

    def test_admin_can_change_user_type(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.put(
            f'/api/users/{self.student.pk}/update/',
            self.profile_payload(user_type='faculty'), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.user_type, User.FACULTY)

    def test_username_cannot_be_changed_through_update(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            f'/api/users/{self.student.pk}/update/',
            self.profile_payload(username='hacker'), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.username, 'student1')

    # ---------- delete ----------

    def test_user_cannot_delete_someone_else(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.delete(f'/api/users/{self.other.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.other.pk).exists())

    def test_non_admin_cannot_delete_self(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.delete(f'/api/users/{self.student.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())

    def test_admin_can_delete_anyone(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.delete(f'/api/users/{self.other.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.other.pk).exists())

    def test_admin_cannot_delete_an_admin_account(self):
        self.login_as('admin1', 'AdminPass123')
        response = self.client.delete(f'/api/users/{self.admin.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_admin_cannot_delete_user_with_return_awaiting_confirmation(self):
        category = Category.objects.create(category_name='Equipment')
        item = Inventory.objects.create(
            item_name='Microscope',
            quantity=2,
            category=category,
            location='Lab',
        )
        transaction = Transaction.objects.create(
            item_name=item,
            user=self.other,
            quantity=1,
            status=Transaction.RETURN_REQUESTED,
        )
        self.login_as('admin1', 'AdminPass123')
        response = self.client.delete(f'/api/users/{self.other.pk}/delete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.other.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=transaction.pk).exists())

    # ---------- password change ----------

    def test_password_change_requires_login(self):
        response = self.client.put(
            '/api/users/password/',
            {'current_password': 'Student Pass123', 'new_password': 'Brand New Pass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_change_rejects_wrong_current_password(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            '/api/users/password/',
            {'current_password': 'wrong', 'new_password': 'BrandNewPass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('StudentPass123'))

    def test_password_change_works_and_new_password_logs_in(self):
        self.login_as('student1', 'StudentPass123')
        response = self.client.put(
            '/api/users/password/',
            {'current_password': 'StudentPass123', 'new_password': 'BrandNewPass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials()
        old = self.client.post(
            '/api/login/', {'username': 'student1', 'password': 'StudentPass123'}, format='json'
        )
        self.assertEqual(old.status_code, status.HTTP_401_UNAUTHORIZED)
        new = self.client.post(
            '/api/login/', {'username': 'student1', 'password': 'Brand New Pass123'}, format='json'
        )
        self.assertEqual(new.status_code, status.HTTP_200_OK)

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        FRONTEND_URL='https://lab.example.edu',
    )
    def test_password_reset_sends_link_and_resets_password(self):
        self.student.email = 'student@example.com'
        self.student.save(update_fields=['email'])

        response = self.client.post(
            '/api/password-reset/',
            {'email': 'STUDENT@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['student@example.com'])
        reset_url = next(
            line for line in mail.outbox[0].body.splitlines()
            if line.startswith('https://lab.example.edu/')
        )
        self.assertTrue(reset_url.startswith('https://lab.example.edu/?reset_uid='))
        params = dict(part.split('=', 1) for part in reset_url.split('?', 1)[1].split('&'))

        reset_response = self.client.post(
            '/api/password-reset/confirm/',
            {
                'uid': params['reset_uid'],
                'token': params['token'],
                'new_password': 'Reset Pass456!',
            },
            format='json',
        )
        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        self.client.credentials()
        login_response = self.client.post(
            '/api/login/',
            {'username': 'student1', 'password': 'Reset Pass456!'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        reused_token = self.client.post(
            '/api/password-reset/confirm/',
            {
                'uid': params['reset_uid'],
                'token': params['token'],
                'new_password': 'AnotherPass789!',
            },
            format='json',
        )
        self.assertEqual(reused_token.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_password_reset_request_does_not_disclose_unknown_email(self):
        self.student.email = 'student@example.com'
        self.student.save(update_fields=['email'])

        known = self.client.post(
            '/api/password-reset/', {'email': 'student@example.com'}, format='json'
        )
        unknown = self.client.post(
            '/api/password-reset/', {'email': 'missing@example.com'}, format='json'
        )
        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_password_reset_rejects_invalid_token(self):
        response = self.client.post(
            '/api/password-reset/confirm/',
            {'uid': ['MQ'], 'token': 'invalid', 'new_password': 'ResetPass456!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.student.check_password('StudentPass123'))
