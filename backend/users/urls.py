from django.urls import path
from .views import *

urlpatterns = [
    path('users/', UserList.as_view()),
    path('users/<int:pk>/', UserDetail.as_view()),
    path('users/<int:pk>/update/', UserUpdate.as_view()),
    path('users/<int:pk>/delete/', UserDelete.as_view()),
    path('users/<int:pk>/role/', UserRoleUpdate.as_view()),
    path('users/password/', PasswordChange.as_view()),
    path('register/', UserRegister.as_view()),
    path('login/', UserLogin.as_view()),
    path('password-reset/', PasswordResetRequest.as_view()),
    path('password-reset/confirm/', PasswordResetConfirm.as_view()),
    path('me/', UserMe.as_view()),
]