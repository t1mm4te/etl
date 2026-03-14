from io import BytesIO

import pandas as pd
import pytest
from django.core.files.base import ContentFile

from core.models import Edge, Node, NodeRun, Pipeline, PipelineRun


@pytest.fixture
def owner_pipeline(user):
    return Pipeline.objects.create(
        owner=user,
        name='Owner pipeline',
        description='Pipeline owned by test user',
    )


@pytest.fixture
def foreign_pipeline(some_users):
    return Pipeline.objects.create(
        owner=some_users[0],
        name='Foreign pipeline',
        description='Pipeline owned by another user',
    )


@pytest.fixture
def owner_source_node(owner_pipeline, ready_datasource):
    return Node.objects.create(
        pipeline=owner_pipeline,
        operation_type=Node.OperationType.SOURCE_FILE,
        label='Source node',
        config={'datasource_id': str(ready_datasource.id)},
        position_x=10,
        position_y=20,
    )


@pytest.fixture
def owner_transform_node(owner_pipeline):
    return Node.objects.create(
        pipeline=owner_pipeline,
        operation_type=Node.OperationType.SELECT_COLUMNS,
        label='Select node',
        config={'columns': ['id', 'name']},
        position_x=100,
        position_y=20,
    )


@pytest.fixture
def owner_edge(owner_pipeline, owner_source_node, owner_transform_node):
    return Edge.objects.create(
        pipeline=owner_pipeline,
        source_node=owner_source_node,
        target_node=owner_transform_node,
        source_port='main',
        target_port='main',
    )


@pytest.fixture
def owner_pipeline_run(owner_pipeline):
    return PipelineRun.objects.create(
        pipeline=owner_pipeline,
        status=PipelineRun.Status.SUCCESS,
    )


@pytest.fixture
def owner_node_run_success(
    datasource_media_root,
    owner_pipeline_run,
    owner_source_node,
):
    dataframe = pd.DataFrame(
        [
            {'id': 1, 'name': 'Alice', 'amount': 10.5},
            {'id': 2, 'name': 'Bob', 'amount': 20.0},
        ]
    )
    buffer = BytesIO()
    dataframe.to_parquet(buffer, index=False, engine='pyarrow')
    buffer.seek(0)

    node_run = NodeRun.objects.create(
        pipeline_run=owner_pipeline_run,
        node=owner_source_node,
        status=NodeRun.Status.SUCCESS,
        output_row_count=2,
        output_columns_meta=[
            {'name': 'id', 'dtype': 'int64'},
            {'name': 'name', 'dtype': 'object'},
            {'name': 'amount', 'dtype': 'float64'},
        ],
    )
    node_run.output_parquet.save(
        'node_output.parquet',
        ContentFile(buffer.getvalue()),
        save=True,
    )
    return node_run
