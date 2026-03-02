from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .models_mixins import (
    CreatedAtModelMixin,
    TimestampedModelMixin,
    UUIDPrimaryKeyModelMixin,
)


class User(AbstractUser):
    """Модель пользователя."""

    first_name = models.CharField(
        'Имя',
        max_length=settings.USER_FIRST_NAME_MAX_LENGTH,
    )
    last_name = models.CharField(
        'Фамилия',
        max_length=settings.USER_LAST_NAME_MAX_LENGTH,
    )
    email = models.EmailField(
        'Почта',
        unique=True,
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'пользователи'
        ordering = ['pk']

    def __str__(self):
        return self.username


class DataSource(UUIDPrimaryKeyModelMixin, TimestampedModelMixin):
    """
    Загруженный файл (CSV/XLSX) или подключение к внешней БД.
    После валидации данные конвертируются в Parquet и хранятся
    во внутреннем хранилище.
    """

    class SourceType(models.TextChoices):
        FILE = 'file', 'Файл'
        DATABASE = 'database', 'База данных'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание'
        PROCESSING = 'processing', 'Обработка'
        READY = 'ready', 'Готов'
        ERROR = 'error', 'Ошибка'

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='data_sources',
        verbose_name='Владелец',
    )
    name = models.CharField(
        'Название',
        max_length=settings.DATA_SOURCE_NAME_MAX_LENGTH
    )
    source_type = models.CharField(
        'Тип источника',
        max_length=settings.DATA_SOURCE_TYPE_MAX_LENGTH,
        choices=SourceType.choices,
        default=SourceType.FILE,
    )
    status = models.CharField(
        'Статус',
        max_length=settings.DATA_SOURCE_STATUS_MAX_LENGTH,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # Загрузка файла
    original_file = models.FileField(
        'Оригинальный файл',
        upload_to='uploads/originals/%Y/%m/',
        blank=True,
    )
    original_filename = models.CharField(
        'Имя файла',
        max_length=settings.DATA_SOURCE_NAME_MAX_LENGTH,
        blank=True,
    )
    sheet_name = models.CharField(
        'Лист (для XLSX)',
        max_length=settings.DATA_SOURCE_NAME_MAX_LENGTH,
        blank=True,
    )

    # Подключение к БД
    db_engine = models.CharField(
        'Движок БД',
        max_length=settings.DATA_SOURCE_DB_ENGINE_MAX_LENGTH,
        blank=True,
        help_text='postgresql, mysql, ...',
    )
    db_host = models.CharField(
        'Хост',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )
    db_port = models.PositiveIntegerField(
        'Порт',
        null=True,
        blank=True
    )
    db_name = models.CharField(
        'Имя БД',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )
    db_user = models.CharField(
        'Пользователь',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )
    db_password = models.CharField(
        'Пароль',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )
    db_schema = models.CharField(
        'Схема',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )
    db_table = models.CharField(
        'Таблица',
        max_length=settings.DB_SPECS_MAX_LENGTH,
        blank=True
    )

    # Результат
    parquet_file = models.FileField(
        'Parquet-файл',
        upload_to='datasets/%Y/%m/',
        blank=True,
    )
    row_count = models.PositiveIntegerField(
        'Число строк', null=True, blank=True,
    )
    column_count = models.PositiveIntegerField(
        'Число столбцов', null=True, blank=True,
    )
    columns_meta = models.JSONField(
        'Метаданные столбцов',
        default=list,
        blank=True,
        help_text='[{"name": "col", "dtype": "int64"}, ...]',
    )
    file_size_bytes = models.PositiveBigIntegerField(
        'Размер файла (байт)',
        null=True,
        blank=True,
    )
    error_message = models.TextField('Ошибка', blank=True)

    class Meta:
        verbose_name = 'Источник данных'
        verbose_name_plural = 'источники данных'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Pipeline(UUIDPrimaryKeyModelMixin, TimestampedModelMixin):
    """Граф обработки данных: содержит узлы (Node) и рёбра (Edge)."""

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='pipelines',
        verbose_name='Владелец',
    )
    name = models.CharField(
        'Название',
        max_length=settings.PIPELINE_NAME_MAX_LENGTH
    )
    description = models.TextField('Описание', blank=True)

    class Meta:
        verbose_name = 'Пайплайн'
        verbose_name_plural = 'пайплайны'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Node(UUIDPrimaryKeyModelMixin, TimestampedModelMixin):
    """
    Узел пайплайна — одна операция обработки данных.
    ``config`` хранит параметры, специфичные для данного типа операции.
    """

    class OperationType(models.TextChoices):
        # Extract
        SOURCE_FILE = 'source_file', 'Загрузка из файла'
        SOURCE_DB = 'source_db', 'Загрузка из БД'
        # Transform
        FILTER_ROWS = 'filter_rows', 'Фильтрация строк'
        SELECT_COLUMNS = 'select_columns', 'Выбор столбцов'
        RENAME_COLUMNS = 'rename_columns', 'Переименование столбцов'
        SORT = 'sort', 'Сортировка'
        JOIN = 'join', 'Объединение таблиц (JOIN)'
        AGGREGATE = 'aggregate', 'Агрегация'
        CAST_TYPES = 'cast_types', 'Приведение типов'
        COMPUTED_COLUMN = 'computed_column', 'Вычисляемый столбец'
        SPLIT_COLUMN = 'split_column', 'Разделение столбца'
        MERGE_COLUMNS = 'merge_columns', 'Слияние столбцов'
        DEDUPLICATE = 'deduplicate', 'Удаление дубликатов'
        FILL_MISSING = 'fill_missing', 'Заполнение пропусков'
        # Load
        EXPORT_FILE = 'export_file', 'Экспорт в файл'

    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='nodes',
        verbose_name='Пайплайн',
    )
    operation_type = models.CharField(
        'Тип операции',
        max_length=settings.NODE_OPERATION_TYPE_MAX_LENGTH,
        choices=OperationType.choices,
    )
    label = models.CharField(
        'Метка',
        max_length=settings.NODE_LABEL_MAX_LENGTH,
        help_text='Человекочитаемое имя узла для отображения на фронте.',
    )
    config = models.JSONField(
        'Конфигурация',
        default=dict,
        blank=True,
        help_text='Параметры операции (зависят от operation_type).',
    )
    # Позиция узла на холсте (для фронтового редактора)
    position_x = models.FloatField('X', default=0)
    position_y = models.FloatField('Y', default=0)

    class Meta:
        verbose_name = 'Узел'
        verbose_name_plural = 'узлы'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.label} ({self.get_operation_type_display()})'


class Edge(UUIDPrimaryKeyModelMixin):
    """Ребро графа — направленная связь между узлами."""

    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='edges',
        verbose_name='Пайплайн',
    )
    source_node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='outgoing_edges',
        verbose_name='Откуда',
    )
    target_node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='incoming_edges',
        verbose_name='Куда',
    )
    source_port = models.CharField(
        'Порт источника',
        max_length=settings.EDGE_PORT_MAX_LENGTH,
        default='main',
        help_text='Для узлов с несколькими выходами.',
    )
    target_port = models.CharField(
        'Порт приёмника',
        max_length=settings.EDGE_PORT_MAX_LENGTH,
        default='main',
        help_text='Для узлов с несколькими входами (напр. JOIN: left/right).',
    )

    class Meta:
        verbose_name = 'Ребро'
        verbose_name_plural = 'рёбра'
        constraints = [
            models.UniqueConstraint(
                fields=['pipeline', 'source_node', 'target_node',
                        'source_port', 'target_port'],
                name='unique_edge',
            ),
        ]

    def __str__(self):
        return f'{self.source_node_id} -> {self.target_node_id}'


class PipelineRun(UUIDPrimaryKeyModelMixin, CreatedAtModelMixin):
    """Конкретный запуск пайплайна."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание'
        RUNNING = 'running', 'Выполняется'
        SUCCESS = 'success', 'Успех'
        FAILED = 'failed', 'Ошибка'
        CANCELLED = 'cancelled', 'Отменён'

    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='runs',
        verbose_name='Пайплайн',
    )
    status = models.CharField(
        'Статус',
        max_length=settings.PIPELINE_RUN_STATUS_MAX_LENGTH,
        choices=Status.choices,
        default=Status.PENDING,
    )
    started_at = models.DateTimeField('Начало', null=True, blank=True)
    finished_at = models.DateTimeField('Завершение', null=True, blank=True)
    error_message = models.TextField('Ошибка', blank=True)
    celery_task_id = models.CharField(
        'Celery Task ID',
        max_length=settings.PIPELINE_RUN_CELERY_TASK_ID_MAX_LENGTH,
        blank=True,
    )

    class Meta:
        verbose_name = 'Запуск пайплайна'
        verbose_name_plural = 'запуски пайплайна'
        ordering = ['-created_at']

    def __str__(self):
        return f'Run {self.pk} — {self.get_status_display()}'


class NodeRun(UUIDPrimaryKeyModelMixin):
    """Запуск одного узла в рамках PipelineRun."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание'
        RUNNING = 'running', 'Выполняется'
        SUCCESS = 'success', 'Успех'
        FAILED = 'failed', 'Ошибка'
        SKIPPED = 'skipped', 'Пропущен'

    pipeline_run = models.ForeignKey(
        PipelineRun,
        on_delete=models.CASCADE,
        related_name='node_runs',
        verbose_name='Запуск пайплайна',
    )
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='runs',
        verbose_name='Узел',
    )
    status = models.CharField(
        'Статус',
        max_length=settings.NODE_RUN_STATUS_MAX_LENGTH,
        choices=Status.choices,
        default=Status.PENDING,
    )
    output_parquet = models.FileField(
        'Выходной Parquet',
        upload_to='runs/outputs/%Y/%m/',
        blank=True,
    )
    output_row_count = models.PositiveIntegerField(
        'Число строк',
        null=True,
        blank=True,
    )
    output_columns_meta = models.JSONField(
        'Метаданные столбцов',
        default=list,
        blank=True,
    )
    error_message = models.TextField('Ошибка', blank=True)
    started_at = models.DateTimeField('Начало', null=True, blank=True)
    finished_at = models.DateTimeField('Завершение', null=True, blank=True)

    class Meta:
        verbose_name = 'Запуск узла'
        verbose_name_plural = 'запуски узлов'
        ordering = ['started_at']

    def __str__(self):
        return f'{self.node} — {self.get_status_display()}'
