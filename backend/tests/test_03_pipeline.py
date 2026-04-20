from http import HTTPStatus

import pytest

from tests.utils import get_results
from core.models import Edge, Node, Pipeline, PipelineRun


@pytest.mark.django_db(transaction=True)
class Test03PipelineAPI:
    URL_PIPELINES = '/api/v1/pipelines/'
    URL_PIPELINES_ID = '/api/v1/pipelines/{pipeline_id}/'
    URL_PIPELINES_RUN = '/api/v1/pipelines/{pipeline_id}/run/'
    URL_PIPELINES_RUNS = '/api/v1/pipelines/{pipeline_id}/runs/'

    def test_03_pipelines_list_returns_only_owner_records(
        self,
        user_client,
        owner_pipeline,
        foreign_pipeline,
    ):
        response = user_client.get(self.URL_PIPELINES)

        assert response.status_code == HTTPStatus.OK
        results = get_results(response.json())
        result_ids = {item['id'] for item in results}

        assert str(owner_pipeline.id) in result_ids
        assert str(foreign_pipeline.id) not in result_ids

    def test_03_pipelines_list_unauthorized_returns_401(self, client):
        response = client.get(self.URL_PIPELINES)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert isinstance(response.json(), dict)

    def test_03_pipelines_retrieve_owner_record(
        self,
        user_client,
        owner_pipeline,
    ):
        response = user_client.get(
            self.URL_PIPELINES_ID.format(pipeline_id=owner_pipeline.id)
        )

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()
        assert response_json['id'] == str(owner_pipeline.id)
        assert response_json['name'] == owner_pipeline.name

    def test_03_pipelines_retrieve_foreign_record_returns_404(
        self,
        user_client,
        foreign_pipeline,
    ):
        response = user_client.get(
            self.URL_PIPELINES_ID.format(pipeline_id=foreign_pipeline.id)
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        assert isinstance(response.json(), dict)

    def test_03_pipelines_create_success_sets_owner(
        self,
        user_client,
        user,
    ):
        payload = {
            'name': 'Created pipeline',
            'description': 'Created from test',
        }

        response = user_client.post(
            self.URL_PIPELINES,
            data=payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        created_id = response.json()['id']
        pipeline = Pipeline.objects.get(id=created_id)

        assert pipeline.owner.pk == user.pk
        assert pipeline.name == payload['name']
        assert pipeline.description == payload['description']

    def test_03_pipelines_partial_update_success(
        self,
        user_client,
        owner_pipeline,
    ):
        response = user_client.patch(
            self.URL_PIPELINES_ID.format(pipeline_id=owner_pipeline.id),
            data={'description': 'Updated description'},
            format='json',
        )

        assert response.status_code == HTTPStatus.OK
        owner_pipeline.refresh_from_db()
        assert owner_pipeline.description == 'Updated description'

    def test_03_pipelines_delete_owner_record(
        self,
        user_client,
        owner_pipeline,
    ):
        response = user_client.delete(
            self.URL_PIPELINES_ID.format(pipeline_id=owner_pipeline.id)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not Pipeline.objects.filter(id=owner_pipeline.id).exists()

    def test_03_pipelines_run_creates_pending_run_and_queues_task(
        self,
        user_client,
        owner_pipeline,
        monkeypatch,
    ):
        called_run_ids = []

        def _delay_mock(pipeline_run_id):
            called_run_ids.append(pipeline_run_id)

        monkeypatch.setattr('api.views.run_pipeline.delay', _delay_mock)

        response = user_client.post(
            self.URL_PIPELINES_RUN.format(pipeline_id=owner_pipeline.id),
            data={},
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        pipeline_run_id = response.json()['id']
        pipeline_run = PipelineRun.objects.get(id=pipeline_run_id)

        assert pipeline_run.pipeline.pk == owner_pipeline.pk
        assert pipeline_run.status == PipelineRun.Status.PENDING
        assert called_run_ids == [str(pipeline_run.id)]

    def test_03_pipelines_runs_returns_newest_first(
        self,
        user_client,
        owner_pipeline,
    ):
        older = PipelineRun.objects.create(
            pipeline=owner_pipeline,
            status=PipelineRun.Status.FAILED,
        )
        newer = PipelineRun.objects.create(
            pipeline=owner_pipeline,
            status=PipelineRun.Status.SUCCESS,
        )

        response = user_client.get(
            self.URL_PIPELINES_RUNS.format(pipeline_id=owner_pipeline.id)
        )

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()

        assert [item['id'] for item in response_json] == [
            str(newer.id),
            str(older.id),
        ]


@pytest.mark.django_db(transaction=True)
class Test03PipelineNodesAPI:
    URL_NODES = '/api/v1/pipelines/{pipeline_id}/nodes/'
    URL_NODE_DETAIL = '/api/v1/pipelines/{pipeline_id}/nodes/{node_id}/'
    URL_NODE_INPUT_COLUMNS = (
        '/api/v1/pipelines/{pipeline_id}/nodes/{node_id}/input-columns/'
    )

    def test_03_nodes_list_returns_nodes_for_pipeline(
        self,
        user_client,
        owner_pipeline,
        owner_source_node,
        owner_transform_node,
    ):
        response = user_client.get(
            self.URL_NODES.format(pipeline_id=owner_pipeline.id)
        )

        assert response.status_code == HTTPStatus.OK
        results = get_results(response.json())
        result_ids = {item['id'] for item in results}

        assert str(owner_source_node.id) in result_ids
        assert str(owner_transform_node.id) in result_ids

    def test_03_nodes_create_success(
        self,
        user_client,
        owner_pipeline,
    ):
        payload = {
            'operation_type': Node.OperationType.FILTER_ROWS,
            'label': 'Filter node',
            'config': {'condition': 'amount > 10'},
            'position_x': 120,
            'position_y': 30,
        }

        response = user_client.post(
            self.URL_NODES.format(pipeline_id=owner_pipeline.id),
            data=payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        node_id = response.json()['id']
        created = Node.objects.get(id=node_id)

        assert created.pipeline.pk == owner_pipeline.pk
        assert created.operation_type == payload['operation_type']
        assert created.label == payload['label']

    def test_03_nodes_retrieve_foreign_record_returns_404(
        self,
        user_client,
        foreign_pipeline,
    ):
        foreign_node = Node.objects.create(
            pipeline=foreign_pipeline,
            operation_type=Node.OperationType.SOURCE_FILE,
            label='Foreign source',
            config={},
        )

        response = user_client.get(
            self.URL_NODE_DETAIL.format(
                pipeline_id=foreign_pipeline.id,
                node_id=foreign_node.id,
            )
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        assert isinstance(response.json(), dict)

    def test_03_nodes_update_and_delete_owner_record(
        self,
        user_client,
        owner_pipeline,
        owner_transform_node,
    ):
        update_response = user_client.patch(
            self.URL_NODE_DETAIL.format(
                pipeline_id=owner_pipeline.id,
                node_id=owner_transform_node.id,
            ),
            data={'label': 'Updated label'},
            format='json',
        )

        assert update_response.status_code == HTTPStatus.OK
        owner_transform_node.refresh_from_db()
        assert owner_transform_node.label == 'Updated label'

        delete_response = user_client.delete(
            self.URL_NODE_DETAIL.format(
                pipeline_id=owner_pipeline.id,
                node_id=owner_transform_node.id,
            )
        )

        assert delete_response.status_code == HTTPStatus.NO_CONTENT
        assert not Node.objects.filter(id=owner_transform_node.id).exists()

    def test_03_nodes_input_columns_source_returns_ready_datasource_meta(
        self,
        user_client,
        owner_pipeline,
        owner_source_node,
        ready_datasource,
    ):
        response = user_client.get(
            self.URL_NODE_INPUT_COLUMNS.format(
                pipeline_id=owner_pipeline.id,
                node_id=owner_source_node.id,
            )
        )

        assert response.status_code == HTTPStatus.OK
        columns = response.json()['columns']

        assert columns == {'output': ready_datasource.columns_meta}

    def test_03_nodes_input_columns_source_without_datasource_id_returns_empty(
        self,
        user_client,
        owner_pipeline,
    ):
        node = Node.objects.create(
            pipeline=owner_pipeline,
            operation_type=Node.OperationType.SOURCE_FILE,
            label='Broken source',
            config={},
        )

        response = user_client.get(
            self.URL_NODE_INPUT_COLUMNS.format(
                pipeline_id=owner_pipeline.id,
                node_id=node.id,
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()['columns'] == {}

    def test_03_nodes_input_columns_source_non_ready_datasource_returns_empty(
        self,
        user_client,
        owner_pipeline,
        pending_datasource,
    ):
        node = Node.objects.create(
            pipeline=owner_pipeline,
            operation_type=Node.OperationType.SOURCE_FILE,
            label='Pending source',
            config={'datasource_id': str(pending_datasource.id)},
        )

        response = user_client.get(
            self.URL_NODE_INPUT_COLUMNS.format(
                pipeline_id=owner_pipeline.id,
                node_id=node.id,
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()['columns'] == {}

    def test_03_nodes_input_columns_non_source_uses_latest_noderun_output(
        self,
        user_client,
        owner_pipeline,
        owner_transform_node,
        owner_edge,
        owner_node_run_success,
    ):
        response = user_client.get(
            self.URL_NODE_INPUT_COLUMNS.format(
                pipeline_id=owner_pipeline.id,
                node_id=owner_transform_node.id,
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()['columns'] == {
            'main': [
                {'name': 'id'},
                {'name': 'name'},
                {'name': 'amount'},
            ]
        }

    def test_03_nodes_input_columns_non_source_fallback_to_datasource_meta(
        self,
        user_client,
        owner_pipeline,
        owner_transform_node,
        owner_edge,
        ready_datasource,
    ):
        response = user_client.get(
            self.URL_NODE_INPUT_COLUMNS.format(
                pipeline_id=owner_pipeline.id,
                node_id=owner_transform_node.id,
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()['columns'] == {
            'main': ready_datasource.columns_meta,
        }


@pytest.mark.django_db(transaction=True)
class Test03PipelineEdgesAPI:
    URL_EDGES = '/api/v1/pipelines/{pipeline_id}/edges/'
    URL_EDGE_DETAIL = '/api/v1/pipelines/{pipeline_id}/edges/{edge_id}/'

    def test_03_edges_list_returns_pipeline_edges(
        self,
        user_client,
        owner_pipeline,
        owner_edge,
    ):
        response = user_client.get(
            self.URL_EDGES.format(pipeline_id=owner_pipeline.id)
        )

        assert response.status_code == HTTPStatus.OK
        results = get_results(response.json())

        assert [item['id'] for item in results] == [str(owner_edge.id)]

    def test_03_edges_create_success(
        self,
        user_client,
        owner_pipeline,
        owner_source_node,
        owner_transform_node,
    ):
        payload = {
            'source_node': str(owner_source_node.id),
            'target_node': str(owner_transform_node.id),
            'source_port': 'main',
            'target_port': 'main',
        }

        response = user_client.post(
            self.URL_EDGES.format(pipeline_id=owner_pipeline.id),
            data=payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        assert Edge.objects.filter(id=response.json()['id']).exists()

    def test_03_edges_create_self_loop_returns_400(
        self,
        user_client,
        owner_pipeline,
        owner_source_node,
    ):
        payload = {
            'source_node': str(owner_source_node.id),
            'target_node': str(owner_source_node.id),
        }

        response = user_client.post(
            self.URL_EDGES.format(pipeline_id=owner_pipeline.id),
            data=payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert isinstance(response.json(), dict)

    def test_03_edges_create_cross_pipeline_nodes_returns_400(
        self,
        user_client,
        owner_pipeline,
        owner_source_node,
        foreign_pipeline,
    ):
        foreign_target = Node.objects.create(
            pipeline=foreign_pipeline,
            operation_type=Node.OperationType.SELECT_COLUMNS,
            label='Foreign target',
            config={'columns': ['id']},
        )
        payload = {
            'source_node': str(owner_source_node.id),
            'target_node': str(foreign_target.id),
        }

        response = user_client.post(
            self.URL_EDGES.format(pipeline_id=owner_pipeline.id),
            data=payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert isinstance(response.json(), dict)

    def test_03_edges_delete_owner_edge(
        self,
        user_client,
        owner_pipeline,
        owner_edge,
    ):
        response = user_client.delete(
            self.URL_EDGE_DETAIL.format(
                pipeline_id=owner_pipeline.id,
                edge_id=owner_edge.id,
            )
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not Edge.objects.filter(id=owner_edge.id).exists()

    def test_03_edges_delete_foreign_edge_returns_404(
        self,
        user_client,
        foreign_pipeline,
    ):
        source = Node.objects.create(
            pipeline=foreign_pipeline,
            operation_type=Node.OperationType.SOURCE_FILE,
            label='Foreign source',
            config={},
        )
        target = Node.objects.create(
            pipeline=foreign_pipeline,
            operation_type=Node.OperationType.SELECT_COLUMNS,
            label='Foreign target',
            config={'columns': ['id']},
        )
        foreign_edge = Edge.objects.create(
            pipeline=foreign_pipeline,
            source_node=source,
            target_node=target,
        )

        response = user_client.delete(
            self.URL_EDGE_DETAIL.format(
                pipeline_id=foreign_pipeline.id,
                edge_id=foreign_edge.id,
            )
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        assert isinstance(response.json(), dict)
