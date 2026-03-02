from django.conf import settings
from djoser.serializers import (
    UserCreateSerializer as UserCreateSerializerBase,
    UserSerializer as UserSerializerBase,
)
from rest_framework import serializers

from core.models import (
    DataSource,
    Edge,
    Node,
    NodeRun,
    Pipeline,
    PipelineRun,
    User,
)
from .utils import Base64ImageField


class UserCreateSerializer(UserCreateSerializerBase):

    class Meta(UserCreateSerializerBase.Meta):
        fields = ('id', 'email', 'username',
                  'last_name', 'first_name', 'password')
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }

    def validate_username(self, value):
        if value == 'me':
            raise serializers.ValidationError(
                'Имя пользователя не может быть `me`.')

        return value


class UserSerializer(UserSerializerBase):
    avatar = serializers.SerializerMethodField(read_only=True)

    class Meta(UserSerializerBase.Meta):
        fields = (
            'id', 'email', 'username', 'last_name', 'first_name', 'avatar'
        )

    def get_avatar(self, obj):
        if not obj.avatar:
            return None

        return obj.avatar.url


class UserAvatarSerializer(serializers.Serializer):
    avatar = Base64ImageField()


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email')
        read_only_fields = fields


class DataSourceListSerializer(serializers.ModelSerializer):

    class Meta:
        model = DataSource
        fields = (
            'id', 'name', 'source_type', 'status',
            'original_filename', 'row_count', 'column_count',
            'created_at', 'updated_at',
        )
        read_only_fields = fields


class DataSourceDetailSerializer(serializers.ModelSerializer):

    class Meta:
        model = DataSource
        fields = (
            'id', 'name', 'source_type', 'status',
            'original_filename', 'sheet_name',
            'row_count', 'column_count', 'columns_meta',
            'file_size_bytes', 'error_message',
            'created_at', 'updated_at',
        )
        read_only_fields = fields


class DataSourceUploadSerializer(serializers.Serializer):

    file = serializers.FileField()
    name = serializers.CharField(
        max_length=settings.DATA_SOURCE_NAME_MAX_LENGTH,
        required=False
    )
    sheet_name = serializers.CharField(
        max_length=settings.DATA_SOURCE_NAME_MAX_LENGTH,
        required=False,
        allow_blank=True
    )

    def validate_file(self, value):
        allowed = ('.csv', '.xlsx', '.xls')
        ext = '.' + \
            value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        if ext not in allowed:
            raise serializers.ValidationError(
                f'Неподдерживаемый формат. Допустимые: {", ".join(allowed)}'
            )
        if value.size > settings.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f'Файл слишком большой ({value.size} байт). '
                f'Максимум: {settings.MAX_FILE_SIZE} байт.'
            )
        return value


class DataSourceDBSerializer(serializers.ModelSerializer):

    class Meta:
        model = DataSource
        fields = (
            'id', 'name',
            'db_engine', 'db_host', 'db_port',
            'db_name', 'db_user', 'db_password',
            'db_schema', 'db_table',
        )
        extra_kwargs = {
            'db_engine': {'required': True},
            'db_host': {'required': True},
            'db_port': {'required': True},
            'db_name': {'required': True},
            'db_user': {'required': True},
            'db_password': {'required': True, 'write_only': True},
            'db_table': {'required': True},
        }


class EdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = (
            'id', 'source_node', 'target_node',
            'source_port', 'target_port',
        )

    def validate(self, data):
        if data['source_node'] == data['target_node']:
            raise serializers.ValidationError(
                'Ребро не может соединять узел с самим собой.'
            )

        if data['source_node'].pipeline_id != data['target_node'].pipeline_id:
            raise serializers.ValidationError(
                'Узлы должны принадлежать одному пайплайну.'
            )
        return data


class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = (
            'id', 'operation_type', 'label', 'config',
            'position_x', 'position_y', 'created_at',
        )
        read_only_fields = ('id', 'created_at')


class PipelineListSerializer(serializers.ModelSerializer):
    node_count = serializers.IntegerField(read_only=True)
    last_run_status = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Pipeline
        fields = (
            'id', 'name', 'description',
            'node_count', 'last_run_status',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PipelineDetailSerializer(serializers.ModelSerializer):

    nodes = NodeSerializer(many=True, read_only=True)
    edges = EdgeSerializer(many=True, read_only=True)

    class Meta:
        model = Pipeline
        fields = (
            'id', 'name', 'description',
            'nodes', 'edges',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PipelineCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = ('id', 'name', 'description')
        read_only_fields = ('id',)


class NodeRunSerializer(serializers.ModelSerializer):
    node_label = serializers.CharField(source='node.label', read_only=True)
    node_operation = serializers.CharField(
        source='node.operation_type', read_only=True,
    )

    class Meta:
        model = NodeRun
        fields = (
            'id', 'node', 'node_label', 'node_operation',
            'status', 'output_row_count', 'output_columns_meta',
            'error_message',
            'started_at', 'finished_at',
        )
        read_only_fields = fields


class PipelineRunListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineRun
        fields = (
            'id', 'pipeline', 'status',
            'created_at', 'started_at', 'finished_at',
            'error_message',
        )
        read_only_fields = fields


class PipelineRunDetailSerializer(serializers.ModelSerializer):
    node_runs = NodeRunSerializer(many=True, read_only=True)

    class Meta:
        model = PipelineRun
        fields = (
            'id', 'pipeline', 'status',
            'created_at', 'started_at', 'finished_at',
            'error_message', 'celery_task_id',
            'node_runs',
        )
        read_only_fields = fields
