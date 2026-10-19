from django.urls import path
from .views import *

urlpatterns = [
    path('transactions/', TransactionList.as_view()),
    path('transactions/create/', TransactionCreate.as_view()),
    path('transactions/<int:pk>/', TransactionDetail.as_view()),
    path('transactions/<int:pk>/update/', TransactionUpdate.as_view()),
    path('transactions/<int:pk>/delete/', TransactionDelete.as_view()),
    path('transactions/<int:pk>/approve/', TransactionApprove.as_view()),
    path('transactions/<int:pk>/return-request/', TransactionReturnRequest.as_view()),
    path('transactions/<int:pk>/return/', TransactionReturn.as_view()),
    path('transactions/<int:pk>/reject/', TransactionReject.as_view()),
    
    # Notification API Routes
    path('notifications/', NotificationListView.as_view()),
    path('notifications/read/', NotificationListView.as_view()),
    path('notifications/<int:pk>/read/', NotificationListView.as_view()),
    path('notifications/<int:pk>/', NotificationListView.as_view()),
]