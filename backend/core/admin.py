from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    DataSource,
    Edge,
    Node,
    NodeRun,
    Pipeline,
    PipelineRun,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    pass


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'source_type', 'status', 'row_count',
                    'created_at')
    list_filter = ('source_type', 'status')
    search_fields = ('name', 'original_filename')
    readonly_fields = ('created_at', 'updated_at')


class NodeInline(admin.TabularInline):
    model = Node
    extra = 0
    fields = ('label', 'operation_type', 'position_x', 'position_y')


class EdgeInline(admin.TabularInline):
    model = Edge
    extra = 0
    fk_name = 'pipeline'


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at', 'updated_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [NodeInline, EdgeInline]


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ('label', 'operation_type', 'pipeline', 'created_at')
    list_filter = ('operation_type',)
    search_fields = ('label',)


class NodeRunInline(admin.TabularInline):
    model = NodeRun
    extra = 0
    readonly_fields = (
        'node', 'status', 'output_row_count',
        'started_at', 'finished_at',
    )


@admin.register(PipelineRun)
class PipelineRunAdmin(admin.ModelAdmin):
    list_display = ('pk', 'pipeline', 'status', 'created_at', 'finished_at')
    list_filter = ('status',)
    readonly_fields = ('created_at',)
    inlines = [NodeRunInline]


@admin.register(NodeRun)
class NodeRunAdmin(admin.ModelAdmin):
    list_display = ('pk', 'node', 'status', 'started_at', 'finished_at')
    list_filter = ('status',)
