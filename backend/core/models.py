from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.indexes import HashIndex
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.crypto import get_random_string

from .models_mixins import CreatedAtModelMixin, UUIDPrimaryKeyModelMixin


class User(AbstractUser):
    """Модель пользователя."""
    first_name = models.CharField(
        'Имя',
        max_length=settings.USER_FIRST_NAME_MAX_LENGTH
    )
    last_name = models.CharField(
        'Фамилия',
        max_length=settings.USER_LAST_NAME_MAX_LENGTH
    )
    email = models.EmailField(
        'Почта',
        unique=True
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'пользователи'
        ordering = ['pk']


class Pipeline(UUIDPrimaryKeyModelMixin,
               CreatedAtModelMixin):
    """Модель пайплайна. Содержит последовательность действий/граф."""
    name = models.CharField(max_length=255)

    class Meta:
        verbose_name = 'Пайплайн'
        verbose_name_plural = 'пайплайны'
        ordering = ['pk']


class Job(UUIDPrimaryKeyModelMixin,
          CreatedAtModelMixin):
    """Модель задачи. Является узлом графа."""
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='jobs',
        verbose_name='Пайплайн'
    )
    key = models.SlugField(  # ТЕХНИЧЕСКИЙ ID (для связей и API)
        max_length=100,
        unique=True,
        verbose_name='Ключевое название'
    )
    name = models.CharField(  # ЧЕЛОВЕЧЕСКОЕ ИМЯ (для отображения на фронтенде)
        max_length=30,
        verbose_name='Название'
    )
    task_function = models.CharField(max_length=255)
    static_arguments = models.JSONField(default=dict, blank=True)
    input_mapping = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Задача'
        verbose_name_plural = 'задачи'
        ordering = ['pk']
        unique_together = ('pipeline', 'key')


class Dependency(UUIDPrimaryKeyModelMixin):
    """
    Модель отношений задач – ребра графа. Определяют порядок выполнения.
    """
    pipeline = models.ForeignKey(
        Pipeline,
        related_name='dependencies',
        on_delete=models.CASCADE
    )
    upstream_job = models.ForeignKey(
        Job,
        related_name='outputs',
        on_delete=models.CASCADE
    )
    downstream_job = models.ForeignKey(
        Job,
        related_name='input',
        on_delete=models.CASCADE
    )

    class Meta:
        verbose_name = 'Зависимость'
        verbose_name_plural = 'зависимости'
        ordering = ['pk']
        unique_together = ('pipeline', 'upstream_job', 'downstream_job')


class PipelineRun(UUIDPrimaryKeyModelMixin,
                  CreatedAtModelMixin):
    """Модель запуска пайплайна. Нужна для хранения состояния запуска."""
    PENDING = 'pending'
    RUNNING = 'runnings'
    SUCCESS = 'success'
    FAILED = 'failed'
    STATUS_CHOICES = {
        PENDING: 'Pending',
        RUNNING: 'Running',
        SUCCESS: 'Success',
        FAILED: 'Failed',
    }

    pipeline = models.ForeignKey(
        Pipeline,
        related_name='runs',
        on_delete=models.CASCADE,
        verbose_name='Пайплайн'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        verbose_name='Статус'
    )
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Запуск пайплайна'
        verbose_name_plural = 'запуски пайплайна'
        ordering = ['pk']


class JobRun(UUIDPrimaryKeyModelMixin):
    """Модель запуска задачи. Нужна для хранения состояния запуска."""
    PENDING = 'pending'
    RUNNING = 'runnings'
    SUCCESS = 'success'
    FAILED = 'failed'
    SKIPPED = 'skipped'
    STATUS_CHOICES = {
        PENDING: 'Pending',
        RUNNING: 'Running',
        SUCCESS: 'Success',
        FAILED: 'Failed',
        SKIPPED: 'skipped'
    }

    pipeline_run = models.ForeignKey(
        PipelineRun,
        related_name='job_runs',
        on_delete=models.CASCADE,
        verbose_name='Запуск пайплайна'
    )
    job = models.ForeignKey(
        Job,
        related_name='job_runs',
        on_delete=models.CASCADE,
        verbose_name='Задача'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        verbose_name='Статус'
    )
    output_data = models.JSONField(default=dict, blank=True, null=True)
    logs = models.TextField(blank=True)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Запуск задачи'
        verbose_name_plural = 'запуски задачи'
        ordering = ['pk']
