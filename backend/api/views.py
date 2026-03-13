from django.conf import settings
from django.db.models import Count, OuterRef, Subquery
from djoser.views import UserViewSet as UserViewSetBase
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import (
    generics,
    mixins,
    permissions,
    serializers,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .serializers import (
    DataSourceDBSerializer,
    DataSourceDetailSerializer,
    DataSourceListSerializer,
    DataSourceUploadSerializer,
    EdgeSerializer,
    NodeSerializer,
    PipelineCreateUpdateSerializer,
    PipelineDetailSerializer,
    PipelineListSerializer,
    PipelineRunDetailSerializer,
    PipelineRunListSerializer,
    UserAvatarSerializer,
)
from .services.operation_catalog import get_catalog, get_categories
from .tasks import process_datasource, run_pipeline
from core.models import DataSource, Edge, Node, NodeRun, Pipeline, PipelineRun


# Общие inline-сериализаторы для preview-ответов
_PREVIEW_RESPONSE = inline_serializer(
    name='PreviewResponse',
    fields={
        'columns': serializers.ListField(
            child=serializers.CharField(),
            help_text='Список имён столбцов.',
        ),
        'dtypes': serializers.DictField(
            child=serializers.CharField(),
            help_text='Словарь {столбец: тип данных}.',
        ),
        'total_rows': serializers.IntegerField(
            help_text='Общее число строк в датасете.',
        ),
        'preview_rows': serializers.IntegerField(
            help_text='Число строк в выборке.',
        ),
        'data': serializers.ListField(
            child=serializers.DictField(),
            help_text='Массив объектов — строки таблицы.',
        ),
    },
)

_LIMIT_PARAM = OpenApiParameter(
    name='limit',
    type=int,
    location=OpenApiParameter.QUERY,
    description=('Максимальное число строк в предпросмотре (по умолчанию '
                 'settings.NUMBER_OF_PREVIEW_LINES).'),
    required=False,
)


class UserViewSet(UserViewSetBase):

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]

        if self.action == 'me':
            return [permissions.IsAuthenticated()]

        return super().get_permissions()


class UserAvatarViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request):
        serializer = UserAvatarSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.avatar = serializer.validated_data['avatar']
        user.save(update_fields=['avatar'])

        return Response(
            data={'avatar': request.build_absolute_uri(user.avatar.url)},
            status=status.HTTP_200_OK
        )

    def destroy(self, request):
        user = request.user
        user.avatar = None
        user.save(update_fields=['avatar'])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Источники данных'])
@extend_schema_view(
    list=extend_schema(
        summary='Список источников данных',
        description=(
            'Возвращает постраничный список всех источников данных '
            'текущего пользователя. Каждый элемент содержит краткую '
            'информацию: тип, статус обработки, число строк/столбцов.'
        ),
    ),
    retrieve=extend_schema(
        summary='Детали источника данных',
        description=(
            'Возвращает полную информацию об источнике, включая '
            'метаданные столбцов (`columns_meta`) и размер файла.'
        ),
    ),
    destroy=extend_schema(
        summary='Удаление источника данных',
        description=(
            'Удаляет источник данных и связанные файлы '
            '(оригинал + Parquet). Действие необратимо.'
        ),
    ),
)
class DataSourceViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    queryset = DataSource.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DataSource.objects.none()
        return DataSource.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return DataSourceListSerializer
        if self.action == 'upload':
            return DataSourceUploadSerializer
        if self.action == 'connect_db':
            return DataSourceDBSerializer
        return DataSourceDetailSerializer

    @extend_schema(
        summary='Загрузка файла (CSV / XLSX)',
        description=(
            'Загружает файл формата CSV или XLSX и ставит его в очередь '
            'на обработку (Celery). После обработки источник переходит '
            'в статус `ready`, а данные конвертируются в Parquet.\n\n'
            '**Ограничения:** макс. размер файла — 100 МБ (MAX_FILE_SIZE), '
            'макс. число строк — 5 000 (DATASOURCE_MAX_ROWS).'
        ),
        request=DataSourceUploadSerializer,
        responses={status.HTTP_201_CREATED: DataSourceDetailSerializer},
    )
    @action(
        detail=False,
        methods=['post'],
        url_path='upload',
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload(self, request):
        serializer = DataSourceUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['file']
        name = serializer.validated_data.get('name', file.name)
        sheet_name = serializer.validated_data.get('sheet_name', None)

        ds = DataSource.objects.create(
            owner=request.user,
            name=name,
            source_type=DataSource.SourceType.FILE,
            original_file=file,
            original_filename=file.name,
            file_size_bytes=file.size,
            sheet_name=sheet_name or '',
        )

        process_datasource.delay(str(ds.pk))

        return Response(
            DataSourceDetailSerializer(ds).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary='Подключение к внешней БД',
        description=(
            'Создаёт источник данных типа `database`. '
            'Данные загружаются из указанной таблицы через SQLAlchemy '
            'и конвертируются в Parquet (асинхронно через Celery).'
        ),
        request=DataSourceDBSerializer,
        responses={status.HTTP_201_CREATED: DataSourceDetailSerializer},
    )
    @action(detail=False, methods=['post'], url_path='connect-db')
    def connect_db(self, request):
        serializer = DataSourceDBSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ds = serializer.save(
            owner=request.user,
            source_type=DataSource.SourceType.DATABASE,
        )
        process_datasource.delay(str(ds.pk))
        return Response(
            DataSourceDetailSerializer(ds).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary='Предпросмотр данных источника',
        description=(
            'Возвращает первые N строк готового источника. '
            'Доступен только для источников в статусе `ready`.'
        ),
        parameters=[_LIMIT_PARAM],
        responses={status.HTTP_200_OK: _PREVIEW_RESPONSE},
    )
    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        from api.services.file_processing import preview_parquet

        ds = self.get_object()
        if ds.status != DataSource.Status.READY or not ds.parquet_file:
            return Response(
                {'detail': 'Данные ещё не готовы.'},
                status=status.HTTP_409_CONFLICT,
            )
        limit = int(
            request.query_params.get(
                'limit',
                settings.NUMBER_OF_PREVIEW_LINES
            )
        )
        data = preview_parquet(ds.parquet_file.path, limit)
        return Response(data)


@extend_schema(tags=['Пайплайны'])
@extend_schema_view(
    list=extend_schema(
        summary='Список пайплайнов',
        description=(
            'Возвращает постраничный список пайплайнов текущего '
            'пользователя. Каждый элемент содержит аннотированные '
            'поля `node_count` и `last_run_status`.'
        ),
    ),
    retrieve=extend_schema(
        summary='Детали пайплайна',
        description=(
            'Возвращает полную структуру пайплайна, '
            'включая вложенные узлы (`nodes`) и рёбра (`edges`).'
        ),
    ),
    create=extend_schema(
        summary='Создание пайплайна',
        description='Создаёт пустой пайплайн. Узлы и рёбра добавляются отдельно.',
    ),
    update=extend_schema(
        summary='Обновление пайплайна',
        description='Полное обновление названия и описания пайплайна.',
    ),
    partial_update=extend_schema(
        summary='Частичное обновление пайплайна',
        description='Частичное обновление (PATCH) — можно передать только изменённые поля.',
    ),
    destroy=extend_schema(
        summary='Удаление пайплайна',
        description='Удаляет пайплайн вместе со всеми его узлами и рёбрами.',
    ),
)
class PipelineViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Pipeline.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Pipeline.objects.none()
        return (
            Pipeline.objects
            .filter(owner=self.request.user)
            .annotate(
                node_count=Count('nodes'),
                last_run_status=Subquery(
                    PipelineRun.objects
                    .filter(pipeline=OuterRef('pk'))
                    .order_by('-created_at')
                    .values('status')[:1]
                ),
            )
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return PipelineListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return PipelineCreateUpdateSerializer
        return PipelineDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @extend_schema(
        summary='Запуск выполнения пайплайна',
        description=(
            'Создаёт новый PipelineRun и ставит задачу в очередь Celery. '
            'Узлы выполняются последовательно в топологическом порядке. '
            'Статус запуска можно отслеживать через `GET /pipeline-runs/{id}/`.'
        ),
        request=None,
        responses={status.HTTP_201_CREATED: PipelineRunListSerializer},
    )
    @action(detail=True, methods=['post'], url_path='run')
    def run_pipeline(self, request, pk=None):
        pipeline = self.get_object()
        pr = PipelineRun.objects.create(
            pipeline=pipeline,
            status=PipelineRun.Status.PENDING,
        )
        run_pipeline.delay(str(pr.pk))
        return Response(
            PipelineRunListSerializer(pr).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary='История запусков пайплайна',
        description=(
            'Возвращает все запуски данного пайплайна, '
            'отсортированные от самого нового к старому.'
        ),
        responses={status.HTTP_200_OK: PipelineRunListSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='runs')
    def runs(self, request, pk=None):
        pipeline = self.get_object()
        qs = PipelineRun.objects.filter(
            pipeline=pipeline).order_by('-created_at')
        serializer = PipelineRunListSerializer(qs, many=True)
        return Response(serializer.data)


@extend_schema(tags=['Узлы пайплайна'])
@extend_schema_view(
    list=extend_schema(
        summary='Список узлов пайплайна',
        description='Возвращает все узлы указанного пайплайна.',
    ),
    retrieve=extend_schema(
        summary='Детали узла',
        description='Возвращает информацию об узле: тип, конфигурацию, позицию на холсте.',
    ),
    create=extend_schema(
        summary='Создание узла',
        description=(
            'Добавляет новый узел в пайплайн. '
            'Поле `operation_type` определяет тип операции, '
            '`config` — JSON-объект с параметрами операции '
            '(см. `GET /operations/` для списка доступных типов).'
        ),
    ),
    update=extend_schema(
        summary='Обновление узла',
        description='Полное обновление параметров узла.',
    ),
    partial_update=extend_schema(
        summary='Частичное обновление узла',
        description='Частичное обновление (PATCH) — например, изменение только `config` или `position_x`/`position_y`.',
    ),
    destroy=extend_schema(
        summary='Удаление узла',
        description='Удаляет узел и все связанные с ним рёбра.',
    ),
)
class NodeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NodeSerializer
    queryset = Node.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Node.objects.none()
        return Node.objects.filter(
            pipeline_id=self.kwargs['pipeline_pk'],
            pipeline__owner=self.request.user,
        )

    def perform_create(self, serializer):
        pipeline = Pipeline.objects.get(
            pk=self.kwargs['pipeline_pk'],
            owner=self.request.user,
        )
        serializer.save(pipeline=pipeline)

    @extend_schema(
        summary='Доступные столбцы входных данных узла',
        description=(
            'Возвращает список столбцов, доступных на входе узла. '
            'Для источников (`source_file`, `source_db`) — столбцы '
            'DataSource. Для остальных — столбцы из выходов '
            'предыдущих узлов (по входящим рёбрам). '
            'Используется фронтендом для автодополнения '
            'в полях конфигурации (фильтры, сортировка и т.д.).'
        ),
        responses={status.HTTP_200_OK: inline_serializer(
            name='InputColumns',
            fields={
                'columns': serializers.DictField(
                    help_text=(
                        'Словарь {порт: [{name, dtype}]}. '
                        'Для обычных узлов — ключ "main", '
                        'для JOIN — "left" и "right".'
                    ),
                ),
            },
        )},
    )
    @action(detail=True, methods=['get'], url_path='input-columns')
    def input_columns(self, request, pipeline_pk=None, pk=None):
        from api.services.file_processing import get_parquet_columns

        node = self.get_object()

        # Источники — столбцы берём из DataSource.columns_meta
        if node.operation_type in (
            Node.OperationType.SOURCE_FILE,
            Node.OperationType.SOURCE_DB,
        ):
            ds_id = (node.config or {}).get('datasource_id')
            if not ds_id:
                return Response({'columns': {}})
            try:
                ds = DataSource.objects.get(
                    pk=ds_id, owner=request.user,
                )
            except DataSource.DoesNotExist:
                return Response({'columns': {}})
            if ds.status != DataSource.Status.READY:
                return Response({'columns': {}})
            return Response({
                'columns': {'output': ds.columns_meta},
            })

        # Остальные — столбцы из выходов предыдущих узлов
        incoming = Edge.objects.filter(
            target_node=node,
            pipeline_id=pipeline_pk,
        ).select_related('source_node')

        result: dict[str, list[dict]] = {}
        for edge in incoming:
            port = edge.target_port or 'main'

            # Сначала ищем последний успешный NodeRun
            nr = (
                NodeRun.objects
                .filter(
                    node=edge.source_node,
                    status=NodeRun.Status.SUCCESS,
                )
                .order_by('-created_at')
                .first()
            )

            if nr and nr.output_parquet:
                col_names = get_parquet_columns(
                    nr.output_parquet.path,
                )
                result[port] = [
                    {'name': c} for c in col_names
                ]
            else:
                # Фоллбэк: columns_meta источника
                src = edge.source_node
                ds_id = (src.config or {}).get('datasource_id')
                if ds_id:
                    try:
                        ds = DataSource.objects.get(
                            pk=ds_id,
                            owner=request.user,
                        )
                        result[port] = ds.columns_meta
                    except DataSource.DoesNotExist:
                        result[port] = []
                else:
                    result[port] = []

        return Response({'columns': result})


@extend_schema(tags=['Рёбра пайплайна'])
@extend_schema_view(
    list=extend_schema(
        summary='Список рёбер пайплайна',
        description='Возвращает все рёбра (связи между узлами) указанного пайплайна.',
    ),
    create=extend_schema(
        summary='Создание ребра',
        description=(
            'Создаёт направленное ребро между двумя узлами одного пайплайна. '
            'Для операции JOIN используйте порты `left` / `right` в `target_port`.'
        ),
    ),
    destroy=extend_schema(
        summary='Удаление ребра',
        description='Удаляет связь между узлами.',
    ),
)
class EdgeViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EdgeSerializer
    queryset = Edge.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Edge.objects.none()
        return Edge.objects.filter(
            pipeline_id=self.kwargs['pipeline_pk'],
            pipeline__owner=self.request.user,
        )

    def perform_create(self, serializer):
        pipeline = Pipeline.objects.get(
            pk=self.kwargs['pipeline_pk'],
            owner=self.request.user,
        )
        serializer.save(pipeline=pipeline)


@extend_schema(
    tags=['Запуски пайплайнов'],
    summary='Детали запуска пайплайна',
    description=(
        'Возвращает полную информацию о запуске, включая список '
        'NodeRun — результат выполнения каждого узла.'
    ),
)
class PipelineRunDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PipelineRunDetailSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PipelineRun.objects.none()
        return PipelineRun.objects.filter(
            pipeline__owner=self.request.user,
        )


@extend_schema(
    tags=['Операции'],
    summary='Каталог доступных операций',
    description=(
        'Возвращает каталог всех операций, сгруппированных по категориям. '
        'Каждая операция содержит `type`, `label`, `description`, '
        '`category`, информацию о входных портах и `config_schema` '
        '(JSON Schema draft-07 для автоматической генерации формы конфигурации).'
    ),
    responses={status.HTTP_200_OK: inline_serializer(
        name='OperationCatalog',
        fields={
            'categories': serializers.DictField(
                help_text='Словарь категорий {id: {label, description, icon, order}}.',
            ),
            'operations': serializers.ListField(
                help_text=(
                    'Список операций. Каждая содержит: type, label, '
                    'description, category, num_inputs, input_ports, '
                    'config_schema.'
                ),
            ),
        },
    )},
)
class OperationListView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = None

    def get(self, request):
        payload = {
            'categories': get_categories(),
            'operations': get_catalog(),
        }
        response = Response(payload)
        response['Cache-Control'] = 'public, max-age=86400'
        return response


@extend_schema(
    tags=['Запуски пайплайнов'],
    summary='Предпросмотр результата узла',
    description=(
        'Возвращает первые N строк выходного Parquet-файла '
        'для успешно выполненного узла (NodeRun в статусе `success`).'
    ),
    parameters=[_LIMIT_PARAM],
    responses={status.HTTP_200_OK: _PREVIEW_RESPONSE},
)
class NodeRunPreviewView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = None

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return NodeRun.objects.none()
        return NodeRun.objects.filter(
            pipeline_run__pipeline__owner=self.request.user,
        )

    def get(self, request, pk=None):
        from api.services.file_processing import preview_parquet

        nr = self.get_queryset().filter(pk=pk).first()
        if not nr:
            return Response(
                {'detail': 'Не найдено.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if nr.status != NodeRun.Status.SUCCESS or not nr.output_parquet:
            return Response(
                {'detail': 'Результат ещё не готов.'},
                status=status.HTTP_409_CONFLICT,
            )
        limit = int(
            request.query_params.get(
                'limit', settings.NUMBER_OF_PREVIEW_LINES
            )
        )
        data = preview_parquet(nr.output_parquet.path, limit)
        return Response(data)
