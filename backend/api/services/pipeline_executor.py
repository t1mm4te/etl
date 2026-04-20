from __future__ import annotations

import io
import logging
from collections import defaultdict, deque

import pandas as pd
from django.core.files.base import ContentFile
from django.utils import timezone

from .operations import get_operation
from core.models import Edge, Node, NodeRun, PipelineRun


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


def _set_pipeline_running(pipeline_run: PipelineRun) -> None:
    pipeline_run.status = PipelineRun.Status.RUNNING
    pipeline_run.started_at = timezone.now()
    pipeline_run.save(update_fields=['status', 'started_at'])


def _set_pipeline_failed(
    pipeline_run: PipelineRun,
    error_message: str,
) -> None:
    pipeline_run.status = PipelineRun.Status.FAILED
    pipeline_run.error_message = error_message
    pipeline_run.finished_at = timezone.now()
    pipeline_run.save(update_fields=['status', 'error_message', 'finished_at'])


def _set_pipeline_success(pipeline_run: PipelineRun) -> None:
    pipeline_run.status = PipelineRun.Status.SUCCESS
    pipeline_run.finished_at = timezone.now()
    pipeline_run.save(update_fields=['status', 'finished_at'])


def _create_node_runs(
    pipeline_run: PipelineRun,
    nodes: list[Node],
) -> dict[str, NodeRun]:
    node_runs: dict[str, NodeRun] = {}
    for node in nodes:
        nr = NodeRun.objects.create(
            pipeline_run=pipeline_run,
            node=node,
            status=NodeRun.Status.PENDING,
        )
        node_runs[node.pk] = nr
    return node_runs


def _execute_ordered_nodes(
    pipeline_run: PipelineRun,
    ordered: list[Node],
    edges: list[Edge],
    node_runs: dict[str, NodeRun],
) -> bool:
    """Выполняет узлы в указанном порядке. Возвращает True при успехе."""
    outputs: dict[str, pd.DataFrame] = {}

    for index, node in enumerate(ordered):
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
            for remaining in ordered[index + 1:]:
                rnr = node_runs[remaining.pk]
                rnr.status = NodeRun.Status.SKIPPED
                rnr.save(update_fields=['status'])

            _set_pipeline_failed(
                pipeline_run,
                f'Ошибка в узле «{node.label}»: {exc}',
            )
            return False

    return True


def _execute_nodes(
    pipeline_run: PipelineRun,
    nodes: list[Node],
    edges: list[Edge],
) -> None:
    if not nodes:
        raise PipelineExecutionError('Пайплайн не содержит узлов.')

    _set_pipeline_running(pipeline_run)
    node_runs = _create_node_runs(pipeline_run, nodes)

    try:
        ordered = topological_sort(nodes, edges)
    except PipelineExecutionError as exc:
        _set_pipeline_failed(pipeline_run, str(exc))
        raise

    is_success = _execute_ordered_nodes(
        pipeline_run=pipeline_run,
        ordered=ordered,
        edges=edges,
        node_runs=node_runs,
    )
    if is_success:
        _set_pipeline_success(pipeline_run)
        logger.info(
            'Пайплайн %s выполнен успешно.',
            pipeline_run.pipeline.name,
        )


def _collect_ancestor_node_ids(
    target_node_id: str,
    edges: list[Edge],
) -> set[str]:
    """Возвращает транзитивное множество предков для целевого узла."""
    ancestors: set[str] = set()
    queue: deque[str] = deque([target_node_id])

    while queue:
        current_node_id = queue.popleft()
        for edge in edges:
            if edge.target_node_id != current_node_id:
                continue
            source_node_id = edge.source_node_id
            if source_node_id in ancestors:
                continue
            ancestors.add(source_node_id)
            queue.append(source_node_id)

    return ancestors


def _get_preview_subgraph(
    pipeline_run: PipelineRun,
) -> tuple[list[Node], list[Edge]]:
    pipeline = pipeline_run.pipeline
    target_node_id = pipeline_run.target_node_id
    if not target_node_id:
        raise PipelineExecutionError(
            'Для preview-запуска не указан целевой узел.'
        )

    nodes = list(pipeline.nodes.all())
    edges = list(pipeline.edges.all())
    node_ids = {node.pk for node in nodes}

    if target_node_id not in node_ids:
        raise PipelineExecutionError(
            'Целевой узел не принадлежит указанному пайплайну.'
        )

    ancestor_ids = _collect_ancestor_node_ids(target_node_id, edges)
    subgraph_node_ids = ancestor_ids | {target_node_id}

    subgraph_nodes = [node for node in nodes if node.pk in subgraph_node_ids]
    subgraph_edges = [
        edge for edge in edges
        if edge.source_node_id in subgraph_node_ids
        and edge.target_node_id in subgraph_node_ids
    ]
    return subgraph_nodes, subgraph_edges


def execute_pipeline(pipeline_run: PipelineRun) -> None:
    """
    Выполняет все узлы пайплайна в топологическом порядке.
    Обновляет статусы PipelineRun и NodeRun в БД.
    """
    pipeline = pipeline_run.pipeline
    nodes = list(pipeline.nodes.all())
    edges = list(pipeline.edges.all())
    _execute_nodes(pipeline_run, nodes, edges)


def execute_pipeline_preview(pipeline_run: PipelineRun) -> None:
    """
    Выполняет только подграф `ancestors + target` для preview-запуска.
    """
    nodes, edges = _get_preview_subgraph(pipeline_run)
    _execute_nodes(pipeline_run, nodes, edges)
