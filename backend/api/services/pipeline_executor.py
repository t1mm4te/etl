from __future__ import annotations

import io
import logging
from collections import defaultdict, deque

import pandas as pd
from django.core.files.base import ContentFile
from django.utils import timezone

from core.models import Edge, Node, NodeRun, PipelineRun

from .operations import get_operation

logger = logging.getLogger(__name__)


class PipelineExecutionError(Exception):
    """Ошибка при выполнении пайплайна."""


def topological_sort(nodes: list[Node], edges: list[Edge]) -> list[Node]:
    """Топологическая сортировка (алгоритм Кана)."""
    node_map = {n.pk: n for n in nodes}
    in_degree: dict = {n.pk: 0 for n in nodes}
    adjacency: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        adjacency[edge.source_node_id].append(edge.target_node_id)
        in_degree[edge.target_node_id] += 1

    queue = deque(
        nid for nid, deg in in_degree.items() if deg == 0
    )
    ordered: list[Node] = []

    while queue:
        nid = queue.popleft()
        ordered.append(node_map[nid])
        for neighbor in adjacency[nid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(ordered) != len(nodes):
        raise PipelineExecutionError(
            'Граф содержит цикл — топологическая сортировка невозможна.'
        )
    return ordered


def _collect_inputs(
    node: Node,
    edges: list[Edge],
    outputs: dict[str, pd.DataFrame],
) -> dict[str, pd.DataFrame]:
    """
    Собирает входные DataFrame для узла на основании рёбер.
    ``outputs`` — словарь {node_pk: DataFrame} уже вычисленных узлов.
    """
    inputs: dict[str, pd.DataFrame] = {}
    for edge in edges:
        if edge.target_node_id == node.pk:
            port = edge.target_port or 'main'
            inputs[port] = outputs[edge.source_node_id]
    return inputs


def _save_output(
    node_run: NodeRun,
    df: pd.DataFrame,
) -> None:
    """Сохраняет результат выполнения узла в Parquet."""
    buf = io.BytesIO()
    df.to_parquet(buf, index=False, engine='pyarrow')
    parquet_bytes = buf.getvalue()

    filename = f'{node_run.pipeline_run_id}_{node_run.node_id}.parquet'
    node_run.output_parquet.save(
        filename,
        ContentFile(parquet_bytes),
        save=False
    )
    node_run.output_row_count = len(df)
    node_run.output_columns_meta = [
        {'name': col, 'dtype': str(dtype)}
        for col, dtype in df.dtypes.items()
    ]


def execute_pipeline(pipeline_run: PipelineRun) -> None:
    """
    Выполняет все узлы пайплайна в топологическом порядке.
    Обновляет статусы PipelineRun и NodeRun в БД.
    """
    pipeline = pipeline_run.pipeline
    nodes = list(pipeline.nodes.all())
    edges = list(pipeline.edges.all())

    if not nodes:
        raise PipelineExecutionError('Пайплайн не содержит узлов.')

    # Обновляем статус запуска
    pipeline_run.status = PipelineRun.Status.RUNNING
    pipeline_run.started_at = timezone.now()
    pipeline_run.save(update_fields=['status', 'started_at'])

    # Создаём NodeRun для каждого узла
    node_runs: dict[str, NodeRun] = {}
    for node in nodes:
        nr = NodeRun.objects.create(
            pipeline_run=pipeline_run,
            node=node,
            status=NodeRun.Status.PENDING,
        )
        node_runs[node.pk] = nr

    # Топологическая сортировка
    try:
        ordered = topological_sort(nodes, edges)
    except PipelineExecutionError as exc:
        pipeline_run.status = PipelineRun.Status.FAILED
        pipeline_run.error_message = str(exc)
        pipeline_run.finished_at = timezone.now()
        pipeline_run.save(
            update_fields=['status', 'error_message', 'finished_at'])
        raise

    # Словарь выходных DataFrame по node.pk
    outputs: dict[str, pd.DataFrame] = {}

    for node in ordered:
        nr = node_runs[node.pk]
        nr.status = NodeRun.Status.RUNNING
        nr.started_at = timezone.now()
        nr.save(update_fields=['status', 'started_at'])

        try:
            op_fn = get_operation(node.operation_type)
            inputs = _collect_inputs(node, edges, outputs)
            df = op_fn(inputs, node.config)

            outputs[node.pk] = df
            _save_output(nr, df)

            nr.status = NodeRun.Status.SUCCESS
            nr.finished_at = timezone.now()
            nr.save(update_fields=[
                'status', 'finished_at',
                'output_parquet', 'output_row_count', 'output_columns_meta',
            ])
            logger.info('Узел %s выполнен: %d строк', node.label, len(df))

        except Exception as exc:
            nr.status = NodeRun.Status.FAILED
            nr.error_message = str(exc)
            nr.finished_at = timezone.now()
            nr.save(update_fields=['status', 'error_message', 'finished_at'])
            logger.exception('Ошибка в узле %s', node.label)

            # Помечаем оставшиеся узлы как SKIPPED
            for remaining in ordered[ordered.index(node) + 1:]:
                rnr = node_runs[remaining.pk]
                rnr.status = NodeRun.Status.SKIPPED
                rnr.save(update_fields=['status'])

            pipeline_run.status = PipelineRun.Status.FAILED
            pipeline_run.error_message = f'Ошибка в узле «{node.label}»: {exc}'
            pipeline_run.finished_at = timezone.now()
            pipeline_run.save(
                update_fields=['status', 'error_message', 'finished_at'])
            return

    # Всё прошло успешно
    pipeline_run.status = PipelineRun.Status.SUCCESS
    pipeline_run.finished_at = timezone.now()
    pipeline_run.save(update_fields=['status', 'finished_at'])
    logger.info('Пайплайн %s выполнен успешно.', pipeline.name)
