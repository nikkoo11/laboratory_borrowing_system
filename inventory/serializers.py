from rest_framework import serializers
from .models import Inventory

class InventorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = Inventory
        fields = '__all__'