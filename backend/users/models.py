# users/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


def remove_spaces(value):
    return value.replace(' ', '') if isinstance(value, str) else value


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    STUDENT = 'student'
    FACULTY = 'faculty'
    STAFF = 'staff'
    USER_TYPE_CHOICES = [
        (STUDENT, 'Student'),
        (FACULTY, 'Faculty'),
        (STAFF, 'Staff'),
    ]

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        STAFF = 'STAFF', 'Staff'
        VIEWER = 'VIEWER', 'Viewer'

    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=254, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default=STUDENT)
    department = models.CharField(max_length=100)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'department']

    objects = UserManager()

    def set_password(self, raw_password):
        super().set_password(remove_spaces(raw_password))

    def save(self, *args, **kwargs):
        self.username = remove_spaces(self.username)
        if self.role == self.Role.ADMIN:
            self.is_staff = True
            self.is_superuser = True
        else:
            self.is_staff = False
            self.is_superuser = False
        super().save(*args, **kwargs)