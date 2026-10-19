from django.db import models
from users.models import User
 
class Staff(models.Model):
    staff_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        db_column='user_id',
    )
    position = models.CharField(max_length=50)
 
    def __str__(self):
        return f'{self.user.first_name} {self.user.last_name} - {self.position}'
 