# transactions/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path('transactions/', TransactionList.as_view()),
    path('transactions/create/', TransactionCreate.as_view()),
    path('transactions/<int:pk>/', TransactionDetail.as_view()),
    path('transactions/<int:pk>/update/', TransactionUpdate.as_view()),
    path('transactions/<int:pk>/delete/', TransactionDelete.as_view()),
    path('transactions/<int:pk>/approve/', TransactionApprove.as_view()),
    path('transactions/<int:pk>/reject/', TransactionReject.as_view()),
]