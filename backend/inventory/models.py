from django.db import models
from category.models import Category


class Inventory(models.Model):
    AVAILABLE = 'available'
    UNAVAILABLE = 'unavailable'
    MAINTENANCE = 'maintenance'
    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (UNAVAILABLE, 'Unavailable'),
        (MAINTENANCE, 'Under Maintenance'),
    ]

    item_id = models.AutoField(primary_key=True)
    item_name = models.CharField(max_length=150)
    quantity = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        db_column='category_id',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=AVAILABLE)
    location = models.CharField(max_length=150)

    def __str__(self):
        return self.item_name