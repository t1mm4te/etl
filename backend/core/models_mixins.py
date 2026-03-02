import uuid

from django.db import models


class UUIDPrimaryKeyModelMixin(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    class Meta:
        abstract = True


class CreatedAtModelMixin(models.Model):
    created_at = models.DateTimeField(
        'Создано',
        auto_now_add=True,
    )

    class Meta:
        abstract = True


class UpdatedAtModelMixin(models.Model):
    updated_at = models.DateTimeField(
        'Обновлено',
        auto_now=True,
    )

    class Meta:
        abstract = True


class TimestampedModelMixin(CreatedAtModelMixin, UpdatedAtModelMixin):
    """Создано + обновлено."""

    class Meta:
        abstract = True
