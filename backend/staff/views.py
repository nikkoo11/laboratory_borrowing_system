
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsAdmin
from .models import Staff
from .serializers import StaffSerializer
from rest_framework.permissions import IsAuthenticated


class StaffList(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            from transactions.permissions import IsStaffOrAdmin
            return [IsStaffOrAdmin()]
        return [IsAdmin()]

    def get(self, request):
        staff = Staff.objects.all().order_by('staff_id')
        serializer = StaffSerializer(staff, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = StaffSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_201_CREATED)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffDetail(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        try:
            staff = Staff.objects.get(pk=pk)
        except Staff.DoesNotExist:
            return Response(data={'message': 'Staff does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffSerializer(staff)
        return Response(serializer.data)


class StaffUpdate(APIView):
    permission_classes = [IsAdmin]
    def put(self, request, pk):
        try:
            staff = Staff.objects.get(pk=pk)
        except Staff.DoesNotExist:
            return Response(data={'message': 'Staff does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffSerializer(instance=staff, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(data=serializer.data)
        return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffDelete(APIView):
    permission_classes = [IsAdmin]
    def delete(self, request, pk):
        try:
            staff = Staff.objects.get(pk=pk)
        except Staff.DoesNotExist:
            return Response(data={'message': 'Staff does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        staff.delete()
        return Response(data={'message': 'Staff deleted.'}, status=status.HTTP_200_OK)