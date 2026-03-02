from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'datasources', views.DataSourceViewSet, basename='datasource')
router.register(r'pipelines', views.PipelineViewSet, basename='pipeline')
router.register('users', views.UserViewSet, basename='user')

pipeline_nested = [
    path(
        '<uuid:pipeline_pk>/nodes/',
        views.NodeViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='pipeline-nodes-list',
    ),
    path(
        '<uuid:pipeline_pk>/nodes/<uuid:pk>/',
        views.NodeViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='pipeline-node-detail',
    ),
    path(
        '<uuid:pipeline_pk>/nodes/<uuid:pk>/input-columns/',
        views.NodeViewSet.as_view({
            'get': 'input_columns',
        }),
        name='pipeline-node-input-columns',
    ),
    path(
        '<uuid:pipeline_pk>/edges/',
        views.EdgeViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='pipeline-edges-list',
    ),
    path(
        '<uuid:pipeline_pk>/edges/<uuid:pk>/',
        views.EdgeViewSet.as_view({
            'delete': 'destroy',
        }),
        name='pipeline-edge-detail',
    ),
]


user_avatar = views.UserAvatarViewSet.as_view(
    {
        'put': 'update',
        'delete': 'destroy'
    }
)


urlpatterns = [
    path('users/me/avatar/', user_avatar, name='user-avatar'),
    path('auth/', include('djoser.urls.authtoken')),
    path('', include(router.urls)),
    path('pipelines/', include(pipeline_nested)),
    path(
        'operations/',
        views.OperationListView.as_view(),
        name='operation-list',
    ),
    path(
        'pipeline-runs/<uuid:pk>/',
        views.PipelineRunDetailView.as_view(),
        name='pipeline-run-detail',
    ),
    path(
        'node-runs/<uuid:pk>/preview/',
        views.NodeRunPreviewView.as_view(),
        name='node-run-preview',
    ),
]
