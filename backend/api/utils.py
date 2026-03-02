import base64
from pathlib import Path

from django.core.files.base import ContentFile
from rest_framework import serializers


BASE_DIR = Path(__file__).resolve().parent


class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]

            data = ContentFile(base64.b64decode(imgstr), name='temp.' + ext)

        return super().to_internal_value(data)

    def to_representation(self, value):
        if not value:
            return None

        return value.url
