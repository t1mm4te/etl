import logging
from pathlib import Path

import pandas as pd
from django.conf import settings
from django.core.files.base import ContentFile


logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}


class FileProcessingError(Exception):
    """Ошибки при обработке файла."""


def validate_extension(filename: str) -> str:
    """Возвращает расширение в нижнем регистре или поднимает ошибку."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileProcessingError(
            f'Неподдерживаемый формат: {ext}. '
            f'Допустимые: {", ".join(sorted(ALLOWED_EXTENSIONS))}'
        )
    return ext


def read_uploaded_file(
    file_path: str,
    ext: str,
    sheet_name: str | None = None,
) -> pd.DataFrame:
    """Читает CSV/XLSX и возвращает DataFrame."""
    try:
        if ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            sheet = sheet_name or 0
            df = pd.read_excel(file_path, sheet_name=sheet)
    except Exception as exc:
        raise FileProcessingError(f'Ошибка чтения файла: {exc}') from exc

    if len(df) > settings.DATASOURCE_MAX_ROWS:
        raise FileProcessingError(
            f'Файл содержит {len(df)} строк '
            f'(максимум {settings.DATASOURCE_MAX_ROWS}).'
        )
    if df.empty:
        raise FileProcessingError('Файл не содержит данных.')
    return df


def get_columns_meta(df: pd.DataFrame) -> list[dict]:
    """Извлекает метаданные столбцов [{name, dtype}]."""
    return [
        {'name': col, 'dtype': str(dtype)}
        for col, dtype in df.dtypes.items()
    ]


def dataframe_to_parquet_bytes(df: pd.DataFrame) -> bytes:
    """Сериализует DataFrame в Parquet (в память)."""
    import io
    buf = io.BytesIO()
    df.to_parquet(buf, index=False, engine='pyarrow')
    return buf.getvalue()


def process_uploaded_file(datasource) -> None:
    """
    Главная функция обработки файла.
    Принимает экземпляр DataSource, читает оригинальный файл,
    валидирует, конвертирует в Parquet и сохраняет результат.
    """
    from core.models import DataSource

    datasource.status = DataSource.Status.PROCESSING
    datasource.save(update_fields=['status'])

    try:
        ext = validate_extension(datasource.original_filename)
        file_path = datasource.original_file.path

        df = read_uploaded_file(
            file_path, ext, datasource.sheet_name or None,
        )

        # Конвертация в Parquet
        parquet_bytes = dataframe_to_parquet_bytes(df)
        parquet_filename = (
            Path(datasource.original_filename).stem + '.parquet'
        )
        datasource.parquet_file.save(
            parquet_filename,
            ContentFile(parquet_bytes),
            save=False,
        )

        # Метаданные
        datasource.row_count = len(df)
        datasource.column_count = len(df.columns)
        datasource.columns_meta = get_columns_meta(df)
        datasource.file_size_bytes = len(parquet_bytes)
        datasource.status = DataSource.Status.READY
        datasource.error_message = ''
        datasource.save()

        logger.info(
            'DataSource %s обработан: %d строк, %d столбцов',
            datasource.pk, datasource.row_count, datasource.column_count,
        )

    except FileProcessingError as exc:
        datasource.status = DataSource.Status.ERROR
        datasource.error_message = str(exc)
        datasource.save(update_fields=['status', 'error_message'])
        logger.warning(
            'Ошибка обработки DataSource %s: %s', datasource.pk, exc)
        raise

    except Exception as exc:
        datasource.status = DataSource.Status.ERROR
        datasource.error_message = f'Непредвиденная ошибка: {exc}'
        datasource.save(update_fields=['status', 'error_message'])
        logger.exception(
            'Непредвиденная ошибка при обработке DataSource %s', datasource.pk)
        raise


def get_parquet_columns(parquet_path: str) -> list[str]:
    """
    Возвращает список имён столбцов из Parquet-файла
    без загрузки данных в память.
    """
    import pyarrow.parquet as pq
    schema = pq.read_schema(parquet_path)
    return schema.names


def preview_parquet(
        parquet_path: str,
        limit: int = settings.NUMBER_OF_PREVIEW_LINES) -> dict:
    """
    Возвращает первые ``limit`` строк из Parquet-файла в виде
    словаря, пригодного для JSON-ответа API.
    """
    df = pd.read_parquet(parquet_path, engine='pyarrow')
    df_head = df.head(limit)
    return {
        'columns': list(df_head.columns),
        'dtypes': {col: str(dtype) for col, dtype in df_head.dtypes.items()},
        'total_rows': len(df),
        'preview_rows': len(df_head),
        'data': df_head.fillna('').to_dict(orient='records'),
    }
