from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin
from .models import Category
from .serializers import CategorySerializer


class CategoryList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class CategoryCreate(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(
            data=serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class CategoryDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response(data={'message': 'Category does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(category)
        return Response(serializer.data)


class CategoryUpdate(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response(data={'message': 'Category does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(instance=category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CategoryDelete(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response(data={'message': 'Category does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            category.delete()
        except ProtectedError:
            return Response(
                data={'message': 'Cannot delete category. Apparatus items are still assigned to it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data={'message': 'Category deleted.'}, status=status.HTTP_200_OK)