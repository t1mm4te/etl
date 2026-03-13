from io import BytesIO
from pathlib import Path

import pandas as pd
import pytest
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile

from core.models import DataSource


TEST_FILES_DIR = Path(__file__).resolve().parent / 'test_files'


def _uploaded_from_path(path: Path, content_type: str) -> SimpleUploadedFile:
    return SimpleUploadedFile(
        name=path.name,
        content=path.read_bytes(),
        content_type=content_type,
    )


@pytest.fixture
def datasource_media_root(settings, tmp_path):
    media_root = tmp_path / 'media'
    media_root.mkdir(parents=True, exist_ok=True)
    settings.MEDIA_ROOT = media_root
    return media_root


@pytest.fixture
def minimal_csv_upload_file():
    return _uploaded_from_path(
        TEST_FILES_DIR / 'minimal_valid.csv',
        'text/csv',
    )


@pytest.fixture
def unsupported_upload_file():
    return _uploaded_from_path(
        TEST_FILES_DIR / 'unsupported.txt',
        'text/plain',
    )


@pytest.fixture
def empty_headers_upload_file():
    return _uploaded_from_path(
        TEST_FILES_DIR / 'empty_headers.csv',
        'text/csv',
    )


@pytest.fixture
def malformed_upload_file():
    return _uploaded_from_path(
        TEST_FILES_DIR / 'malformed.csv',
        'text/csv',
    )


@pytest.fixture
def minimal_xlsx_upload_file():
    dataframe = pd.DataFrame(
        [
            {'id': 1, 'name': 'Alice', 'amount': 10.5},
            {'id': 2, 'name': 'Bob', 'amount': 20.0},
        ]
    )
    buffer = BytesIO()
    dataframe.to_excel(buffer, index=False)
    buffer.seek(0)
    return SimpleUploadedFile(
        name='minimal_valid.xlsx',
        content=buffer.getvalue(),
        content_type=(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ),
    )


@pytest.fixture
def owner_datasource(user):
    return DataSource.objects.create(
        owner=user,
        name='Owner data source',
        source_type=DataSource.SourceType.FILE,
        status=DataSource.Status.PENDING,
        original_filename='owner.csv',
    )


@pytest.fixture
def foreign_datasource(some_users):
    return DataSource.objects.create(
        owner=some_users[0],
        name='Foreign data source',
        source_type=DataSource.SourceType.FILE,
        status=DataSource.Status.PENDING,
        original_filename='foreign.csv',
    )


@pytest.fixture
def ready_datasource(user):
    dataframe = pd.DataFrame(
        [
            {'id': 1, 'name': 'Alice', 'amount': 10.5},
            {'id': 2, 'name': 'Bob', 'amount': 20.0},
            {'id': 3, 'name': 'Charlie', 'amount': 0.0},
        ]
    )
    parquet_bytes = dataframe.to_parquet(index=False, engine='pyarrow')

    datasource = DataSource.objects.create(
        owner=user,
        name='Ready source',
        source_type=DataSource.SourceType.FILE,
        status=DataSource.Status.READY,
        original_filename='ready.csv',
        row_count=3,
        column_count=3,
        columns_meta=[
            {'name': 'id', 'dtype': 'int64'},
            {'name': 'name', 'dtype': 'object'},
            {'name': 'amount', 'dtype': 'float64'},
        ],
    )
    datasource.parquet_file.save(
        'ready.parquet',
        ContentFile(parquet_bytes),
        save=True,
    )
    return datasource


@pytest.fixture
def pending_datasource(user):
    return DataSource.objects.create(
        owner=user,
        name='Pending source',
        source_type=DataSource.SourceType.FILE,
        status=DataSource.Status.PENDING,
        original_filename='pending.csv',
    )


@pytest.fixture
def valid_connect_db_payload():
    return {
        'name': 'postgres source',
        'db_engine': 'postgresql',
        'db_host': 'localhost',
        'db_port': 5432,
        'db_name': 'etl',
        'db_user': 'etl_user',
        'db_password': 'etl_password',
        'db_schema': 'public',
        'db_table': 'orders',
    }
