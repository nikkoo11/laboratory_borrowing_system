from django.urls import path
from .views import *
 
urlpatterns = [
    path('inventory/', InventoryList.as_view()),
    path('inventory/create/', InventoryCreate.as_view()),
    path('inventory/<int:pk>/', InventoryDetail.as_view()),
    path('inventory/<int:pk>/update/', InventoryUpdate.as_view()),
    path('inventory/<int:pk>/delete/', InventoryDelete.as_view()),
]