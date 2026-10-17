from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/', include('users.urls')),
    path('api/', include('staff.urls')),
    path('api/', include('category.urls')),
    path('api/', include('inventory.urls')),
    path('api/', include('transactions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)