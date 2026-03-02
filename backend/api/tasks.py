import logging

from celery import shared_task

from core.models import DataSource, PipelineRun
from .services.pipeline_executor import execute_pipeline, process_uploaded_file


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def process_datasource(self, datasource_id: str) -> dict:
    """
    Асинхронная обработка загруженного файла:
    валидация → конвертация в Parquet -> сохранение метаданных.
    """
    datasource = DataSource.objects.get(pk=datasource_id)
    try:
        process_uploaded_file(datasource)
        return {'status': 'ok', 'datasource_id': str(datasource_id)}
    except Exception as exc:
        logger.exception('Задача process_datasource провалена: %s', exc)
        return {'status': 'error', 'error': str(exc)}


@shared_task(bind=True, max_retries=0)
def run_pipeline(self, pipeline_run_id: str) -> dict:
    """
    Асинхронное выполнение пайплайна (все узлы последовательно
    в топологическом порядке).
    """
    pipeline_run = PipelineRun.objects.select_related('pipeline').get(
        pk=pipeline_run_id,
    )
    pipeline_run.celery_task_id = self.request.id or ''
    pipeline_run.save(update_fields=['celery_task_id'])

    try:
        execute_pipeline(pipeline_run)
        return {'status': 'ok', 'pipeline_run_id': str(pipeline_run_id)}
    except Exception as exc:
        logger.exception('Задача run_pipeline провалена: %s', exc)
        return {'status': 'error', 'error': str(exc)}
