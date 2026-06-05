import logging
import io
from pathlib import Path

from celery import shared_task
import pandas as pd
from django.core.mail import EmailMessage, send_mail
from django.conf import settings

from .services.db_ingest import process_db_source
from .services.file_processing import process_uploaded_file
from .services.pipeline_executor import (
    execute_pipeline,
    execute_pipeline_preview,
)
from core.models import DataSource, PipelineRun


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_email(self, email: str, code: str) -> dict:
    """Асинхронная отправка письма с кодом подтверждения."""
    subject = 'Код подтверждения регистрации'
    message = f'Ваш код подтверждения: {code}\nКод действителен в течение {settings.EMAIL_VERIFICATION_CODE_LIFETIME_MINUTES} минут.'

    try:
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [email],
            fail_silently=False,
        )
        return {'status': 'ok', 'email': email}
    except Exception as exc:
        logger.exception('Ошибка при отправке письма: %s', exc)
        self.retry(exc=exc, countdown=60)
        return {'status': 'error', 'error': str(exc)}


@shared_task(bind=True, max_retries=0)
def process_datasource(self, datasource_id: str, db_password: str | None = None) -> dict:
    """
    Асинхронная обработка источника данных:
    файл → Parquet или БД → Parquet.
    """
    datasource = DataSource.objects.get(pk=datasource_id)
    try:
        if datasource.source_type == DataSource.SourceType.DATABASE:
            process_db_source(datasource, db_password or '')
        else:
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


@shared_task(bind=True, max_retries=0)
def run_pipeline_preview(self, pipeline_run_id: str) -> dict:
    """
    Асинхронный preview-запуск: выполняет только целевой узел
    и всех его предков.
    """
    pipeline_run = PipelineRun.objects.select_related('pipeline').get(
        pk=pipeline_run_id,
    )
    pipeline_run.celery_task_id = self.request.id or ''
    pipeline_run.save(update_fields=['celery_task_id'])

    try:
        execute_pipeline_preview(pipeline_run)
        return {'status': 'ok', 'pipeline_run_id': str(pipeline_run_id)}
    except Exception as exc:
        logger.exception('Задача run_pipeline_preview провалена: %s', exc)
        return {'status': 'error', 'error': str(exc)}


@shared_task(bind=True, max_retries=3)
def send_export_email_task(self, node_run_id: str, export_format: str, file_name: str | None = None) -> dict:
    """Асинхронная конвертация и отправка результата выполнения узла на почту."""
    from core.models import NodeRun

    try:
        nr = NodeRun.objects.select_related(
            'pipeline_run__pipeline__owner',
            'node'
        ).get(pk=node_run_id)

        user = nr.pipeline_run.pipeline.owner
        df = pd.read_parquet(nr.output_parquet.path, engine='pyarrow')
        content = io.BytesIO()

        if export_format == 'csv':
            content.write(df.to_csv(index=False).encode('utf-8'))
            mime_type = 'text/csv'
        elif export_format == 'parquet':
            df.to_parquet(content, index=False, engine='pyarrow')
            mime_type = 'application/octet-stream'
        else:
            export_format = 'xlsx'
            df.to_excel(content, index=False)
            mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        content.seek(0)

        if file_name and file_name.strip():
            safe_name = Path(file_name.strip()).stem
        else:
            safe_name = Path(nr.node.label).stem

        final_filename = f"{safe_name}.{export_format}"

        subject = f"Отчет из пайплайна: {nr.pipeline_run.pipeline.name}"
        body = (
            f"Здравствуйте, {user.first_name}!\n\n"
            f"Ваш пайплайн успешно выполнил экспорт.\n"
            f"Во вложении находится ваш файл: {final_filename}."
        )

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.EMAIL_HOST_USER,
            to=[user.email],
        )
        email.attach(final_filename, content.read(), mime_type)
        email.send(fail_silently=False)

        return {'status': 'ok', 'user_email': user.email}

    except Exception as exc:
        logger.exception('Ошибка при отправке письма с файлом: %s', exc)
        self.retry(exc=exc, countdown=60)
        return {'status': 'error', 'error': str(exc)}
