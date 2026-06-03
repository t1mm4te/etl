from __future__ import annotations

import logging
import re

import pandas as pd
from django.conf import settings
from django.core.files.base import ContentFile
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from core.models import DataSource
from .db_utils import normalize_db_options, resolve_db_engine
from .file_processing import (
    FileProcessingError,
    dataframe_to_parquet_bytes,
    get_columns_meta,
    normalize_dataframe_columns,
)


logger = logging.getLogger(__name__)

_IDENTIFIER_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


def _quote_identifier(value: str, label: str) -> str:
    if not value:
        raise FileProcessingError(f'Имя {label} не указано.')
    if not _IDENTIFIER_RE.match(value):
        raise FileProcessingError(
            f'Недопустимое имя {label}. Используйте латиницу, цифры и _.'
        )
    return f'"{value}"'


def _build_db_url(datasource: DataSource, db_password: str) -> URL:
    if not db_password:
        raise FileProcessingError('Пароль БД не указан.')

    try:
        drivername = resolve_db_engine(datasource.db_engine)
    except ValueError as exc:
        raise FileProcessingError(str(exc)) from exc

    try:
        db_options = normalize_db_options(
            datasource.db_engine,
            datasource.db_options,
        )
    except ValueError as exc:
        raise FileProcessingError(str(exc)) from exc

    return URL.create(
        drivername=drivername,
        username=datasource.db_user,
        password=db_password,
        host=datasource.db_host,
        port=datasource.db_port,
        database=datasource.db_name,
        query=db_options,
    )


def _read_table(datasource: DataSource, db_password: str) -> tuple[pd.DataFrame, int]:
    url = _build_db_url(datasource, db_password)
    engine = create_engine(url)

    try:
        schema = (datasource.db_schema or '').strip()
        table = (datasource.db_table or '').strip()
        table_name = _quote_identifier(table, 'таблицы')
        if schema:
            schema_name = _quote_identifier(schema, 'схемы')
            qualified = f'{schema_name}.{table_name}'
        else:
            qualified = table_name

        count_stmt = text(f'SELECT COUNT(*) FROM {qualified}')
        data_stmt = text(
            f'SELECT * FROM {qualified} LIMIT :limit'
        )

        with engine.connect() as conn:
            total_rows = conn.execute(count_stmt).scalar_one()

            if total_rows == 0:
                raise FileProcessingError('Таблица не содержит данных.')

            result = conn.execute(
                data_stmt,
                {'limit': settings.DATASOURCE_MAX_ROWS},
            )
            rows = result.fetchall()
            df = pd.DataFrame(rows, columns=result.keys())

        return df, int(total_rows)
    finally:
        engine.dispose()


def process_db_source(datasource: DataSource, db_password: str) -> None:
    datasource.status = DataSource.Status.PROCESSING
    if datasource.db_password:
        datasource.db_password = ''
        datasource.save(update_fields=['status', 'db_password'])
    else:
        datasource.save(update_fields=['status'])

    try:
        df, total_rows = _read_table(datasource, db_password)
        df = normalize_dataframe_columns(df)

        parquet_bytes = dataframe_to_parquet_bytes(df)
        parquet_filename = f'db_{datasource.pk}.parquet'
        datasource.parquet_file.save(
            parquet_filename,
            ContentFile(parquet_bytes),
            save=False,
        )

        datasource.row_count = len(df)
        datasource.column_count = len(df.columns)
        datasource.columns_meta = get_columns_meta(df)
        datasource.file_size_bytes = len(parquet_bytes)
        datasource.status = DataSource.Status.READY

        if total_rows > settings.DATASOURCE_MAX_ROWS:
            datasource.error_message = (
                f'Загружено не все: {len(df)} из {total_rows} строк, '
                f'обрезано до {settings.DATASOURCE_MAX_ROWS}.'
            )
        else:
            datasource.error_message = ''

        datasource.save()
        logger.info(
            'DataSource %s загружен из БД: %d строк, %d столбцов',
            datasource.pk,
            datasource.row_count,
            datasource.column_count,
        )

    except FileProcessingError as exc:
        datasource.status = DataSource.Status.ERROR
        datasource.error_message = str(exc)
        datasource.save(update_fields=['status', 'error_message'])
        logger.warning(
            'Ошибка загрузки DataSource %s из БД: %s', datasource.pk, exc
        )
        raise

    except Exception as exc:
        datasource.status = DataSource.Status.ERROR
        datasource.error_message = f'Непредвиденная ошибка: {exc}'
        datasource.save(update_fields=['status', 'error_message'])
        logger.exception(
            'Непредвиденная ошибка при загрузке DataSource %s из БД',
            datasource.pk,
        )
        raise
