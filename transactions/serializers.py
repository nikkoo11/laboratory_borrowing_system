from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item_name.item_name', read_only=True)
    item_location = serializers.CharField(source='item_name.location', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField(read_only=True)
    approver_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'

    def get_user_full_name(self, obj):
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name or obj.user.username
        return ""

    def get_approver_name(self, obj):
        if obj.approver and obj.approver.user:
            name = f"{obj.approver.user.first_name} {obj.approver.user.last_name}".strip()
            return name or obj.approver.user.username
        return None