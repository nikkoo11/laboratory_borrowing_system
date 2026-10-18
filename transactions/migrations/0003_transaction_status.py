from django.db import migrations, models


def backfill_status(apps, schema_editor):
    Transaction = apps.get_model('transactions', 'Transaction')
    Transaction.objects.filter(return_datetime__isnull=False).update(status='returned')
    Transaction.objects.filter(return_datetime__isnull=True).update(status='approved')


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0002_transaction_borrow_datetime_transaction_quantity_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending Approval'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('returned', 'Returned'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_status, migrations.RunPython.noop),
    ]
