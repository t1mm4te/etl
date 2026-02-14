import uuid

from django.db import models
from django.utils.timezone import now


class CreatedAtModelMixin(models.Model):
    created = models.DateTimeField(
        'Создано',
        auto_now_add=now
    )

    class Meta:
        abstract = True


class UUIDPrimaryKeyModelMixin(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    class Meta:
        abstract = True
