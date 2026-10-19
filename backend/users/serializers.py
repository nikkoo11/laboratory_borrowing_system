from rest_framework import serializers
from .models import User, remove_spaces


class UserSerializer(serializers.ModelSerializer):
    """Used for register, admin list/create, and detail views."""
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'username', 'password', 'email', 'first_name', 'last_name', 'user_type', 'department', 'role']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def validate_username(self, value):
        username = remove_spaces(value)
        existing = User.objects.filter(username=username)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return username

    def validate_password(self, value):
        return remove_spaces(value)

    def validate_email(self, value):
        if not value:
            return None
        normalized = value.strip().lower()
        existing = User.objects.filter(email__iexact=normalized)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('This email address is already in use.')
        return normalized


class UserRegisterSerializer(UserSerializer):
    email = serializers.EmailField()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Profile edits. No password here, and username is locked."""

    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'first_name', 'last_name', 'user_type', 'department']
        read_only_fields = ['user_id', 'username']
        extra_kwargs = {'user_type': {'required': False}}

    def validate_email(self, value):
        normalized = value.strip().lower()
        existing = User.objects.filter(email__iexact=normalized)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('This email address is already in use.')
        return normalized

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
        if not user.check_password(remove_spaces(value)):
            raise serializers.ValidationError('Current password is incorrect.')
        return remove_spaces(value)

    def validate_new_password(self, value):
        return remove_spaces(value)

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        value = remove_spaces(value)
        validate_password(value, user=self.context['user'])
        return value


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'role']
        read_only_fields = ['user_id']


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'first_name', 'last_name', 'user_type', 'department', 'role']
        read_only_fields = fields