# category/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path('categories/', CategoryList.as_view()),
    path('categories/create/', CategoryCreate.as_view()),
    path('categories/<int:pk>/', CategoryDetail.as_view()),
    path('categories/<int:pk>/update/', CategoryUpdate.as_view()),
    path('categories/<int:pk>/delete/', CategoryDelete.as_view()),
]