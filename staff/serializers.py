from rest_framework import serializers
from .models import Staff

class StaffSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField(read_only=True)
    department = serializers.CharField(source='user.department', read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'

    def get_full_name(self, obj):
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name or obj.user.username
        return ""