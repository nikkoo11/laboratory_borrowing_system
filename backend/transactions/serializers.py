from rest_framework import serializers
from users.models import User
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

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        is_staff_or_admin = bool(
            user and getattr(user, 'role', None) in (User.Role.ADMIN, User.Role.STAFF)
        )
        if not is_staff_or_admin or not validated_data.get('approver'):
            if not is_staff_or_admin and user and user.is_authenticated:
                validated_data['user'] = user
            validated_data['approver'] = None
            validated_data['status'] = Transaction.PENDING
            validated_data.pop('return_datetime', None)
        else:
            validated_data.setdefault('status', Transaction.APPROVED)
        return super().create(validated_data)

    def validate_quantity(self, value):
        if value is None or value < 1:
            raise serializers.ValidationError('Borrow quantity must be at least 1.')
        return value

    def validate(self, attrs):
        instance = self.instance
        # Validate apparatus availability and stock on new borrow requests / loans
        if not instance:
            item = attrs.get('item_name')
            qty = attrs.get('quantity', 1)
            if item:
                if item.status != 'available':
                    raise serializers.ValidationError({
                        'item_name': f'Apparatus "{item.item_name}" is currently {item.get_status_display().lower()} and cannot be borrowed.',
                    })
                if item.quantity < qty:
                    raise serializers.ValidationError({
                        'quantity': f'Insufficient stock: only {item.quantity} unit(s) available.',
                    })
        elif instance.status == Transaction.PENDING and ('item_name' in attrs or 'quantity' in attrs):
            item = attrs.get('item_name', instance.item_name)
            qty = attrs.get('quantity', instance.quantity)
            if item.status != 'available':
                raise serializers.ValidationError({
                    'item_name': f'Apparatus "{item.item_name}" is currently {item.get_status_display().lower()} and cannot be borrowed.',
                })
            if item.quantity < qty:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock: only {item.quantity} unit(s) available.',
                })
        return attrs
