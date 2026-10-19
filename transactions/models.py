from django.db import models
from django.utils import timezone
from users.models import User
from staff.models import Staff
from inventory.models import Inventory


class Transaction(models.Model):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    RETURNED = 'returned'
    STATUS_CHOICES = [
        (PENDING, 'Pending Approval'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (RETURNED, 'Returned'),
    ]

    transaction_id = models.AutoField(primary_key=True)
    item_name = models.ForeignKey(Inventory, on_delete=models.CASCADE, db_column='item_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    approver = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='approver_id',
    )
    borrow_datetime = models.DateTimeField(default=timezone.now)
    return_datetime = models.DateTimeField(null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)

    def __str__(self):
        return f'Transaction #{self.transaction_id}'


class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        db_column='recipient_id'
    )
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        db_column='transaction_id'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Notification #{self.notification_id} for {self.recipient.username}'