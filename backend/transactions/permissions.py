from rest_framework.permissions import BasePermission
from users.models import User


class IsOwnerStaffOrAdmin(BasePermission):
    """
    Object-level permission for a transaction:
    - the borrowing user (owner) can access their own transaction
    - any STAFF or ADMIN can access any transaction
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return True
        return obj.user_id == user.pk


class IsStaffOrAdmin(BasePermission):
    """Any STAFF role or ADMIN. Used for endpoints/fields the borrowing user cannot touch."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.ADMIN, User.Role.STAFF)
        )