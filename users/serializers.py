from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Used for register, admin list/create, and detail views."""
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'username', 'password', 'first_name', 'last_name', 'user_type', 'department', 'role']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Profile edits. No password here, and username is locked."""

    class Meta:
        model = User
        fields = ['user_id', 'username', 'first_name', 'last_name', 'user_type', 'department']
        read_only_fields = ['user_id', 'username']
        extra_kwargs = {'user_type': {'required': False}}

    def validate_user_type(self, value):
        request = self.context.get('request')
        is_admin = request is not None and request.user.role == User.Role.ADMIN
        if not is_admin and value != self.instance.user_type:
            raise serializers.ValidationError('Only an admin can change user type.')
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'role']
        read_only_fields = ['user_id']


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'first_name', 'last_name', 'user_type', 'department', 'role']
        read_only_fields = fields