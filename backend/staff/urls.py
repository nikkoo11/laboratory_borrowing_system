from django.urls import path
from .views import *

urlpatterns = [
    path('staff/', StaffList.as_view()),
    path('staff/<int:pk>/', StaffDetail.as_view()),
    path('staff/<int:pk>/update/', StaffUpdate.as_view()),
    path('staff/<int:pk>/delete/', StaffDelete.as_view()),
]