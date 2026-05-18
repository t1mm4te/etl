from http import HTTPStatus

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from api.serializers import DataSourceDBSerializer, DataSourceCreateSerializer
from core.models import DataSource, SourceFile


@pytest.mark.django_db(transaction=True)
class Test02DataSourceAPI:
    URL_FILES = '/api/v1/files/'
    URL_FILES_ID = '/api/v1/files/{file_id}/'
    URL_DATASOURCES = '/api/v1/datasources/'
    URL_DATASOURCES_ID = '/api/v1/datasources/{datasource_id}/'
    URL_DATASOURCES_CONNECT_DB = '/api/v1/datasources/connect-db/'
    URL_DATASOURCES_PREVIEW = '/api/v1/datasources/{datasource_id}/preview/'

    def test_02_files_list_returns_only_owner_records(
        self,
        user_client,
        owner_source_file,
        foreign_source_file,
    ):
        """Пользователю возвращает только его SourceFiles."""
        response = user_client.get(self.URL_FILES)

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()
        assert isinstance(response_json, dict)

        results = response_json.get('results', [])
        result_ids = {item['id'] for item in results}

        assert str(owner_source_file.id) in result_ids
        assert str(foreign_source_file.id) not in result_ids

    def test_02_files_delete_owner_record(
        self,
        user_client,
        owner_source_file,
    ):
        """Удаление SourceFile каскадно удаляет файлы."""
        response = user_client.delete(
            self.URL_FILES_ID.format(file_id=owner_source_file.id)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not SourceFile.objects.filter(id=owner_source_file.id).exists()

    def test_02_files_upload_csv_success(
        self,
        user_client,
        user,
        minimal_csv_upload_file,
        datasource_media_root,
    ):
        """Успешная загрузка CSV файла в SourceFile."""
        response = user_client.post(
            self.URL_FILES,
            data={'file': minimal_csv_upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.CREATED
        response_json = response.json()
        created_id = response_json['id']

        sf = SourceFile.objects.get(id=created_id)
        assert sf.owner.pk == user.pk
        assert sf.original_filename == 'minimal_valid.csv'
        assert sf.sheets_metadata == [{"sheet_name": "default", "index": 0}]

    def test_02_files_upload_xlsx_success(
        self,
        user_client,
        user,
        multi_sheet_xlsx_upload_file,
        datasource_media_root,
    ):
        """Успешная загрузка XLSX файла в SourceFile с чтением всех листов."""
        response = user_client.post(
            self.URL_FILES,
            data={'file': multi_sheet_xlsx_upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.CREATED
        sf = SourceFile.objects.get(id=response.json()['id'])
        assert sf.owner.pk == user.pk
        assert sf.original_filename == 'multi_sheet.xlsx'
        assert len(sf.sheets_metadata) == 2
        assert sf.sheets_metadata[0]['sheet_name'] == 'summary'
        assert sf.sheets_metadata[1]['sheet_name'] == 'orders'

    def test_02_files_upload_unsupported_extension_returns_400(
        self,
        user_client,
        unsupported_upload_file,
    ):
        """Загрузка файла с неподдерживаемым расширением в SourceFile возвращает 400."""
        before_count = SourceFile.objects.count()

        response = user_client.post(
            self.URL_FILES,
            data={'file': unsupported_upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert 'file' in response.json()
        assert SourceFile.objects.count() == before_count

    def test_02_datasources_list_returns_only_owner_records(
        self,
        user_client,
        owner_datasource,
        foreign_datasource,
    ):
        """Пользователю возвращает только его Datasource."""
        response = user_client.get(self.URL_DATASOURCES)

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()
        assert isinstance(response_json, dict)

        results = response_json.get('results', [])
        result_ids = {item['id'] for item in results}

        assert str(owner_datasource.id) in result_ids
        assert str(foreign_datasource.id) not in result_ids

    def test_02_datasources_list_filters_by_source_file_id(
        self,
        user_client,
        owner_datasource,
        ready_datasource,
    ):
        """Фильтрация через ?source_file_id=... работает корректно."""
        response = user_client.get(
            f"{self.URL_DATASOURCES}?source_file_id={owner_datasource.source_file_id}"
        )
        assert response.status_code == HTTPStatus.OK
        result_ids = {item['id'] for item in response.json().get('results', [])}
        
        assert str(owner_datasource.id) in result_ids
        assert str(ready_datasource.id) in result_ids

    def test_02_datasources_retrieve_owner_record(
        self,
        user_client,
        owner_datasource,
    ):
        """Пользователь обращается к конкретному Datasource."""
        response = user_client.get(
            self.URL_DATASOURCES_ID.format(datasource_id=owner_datasource.id)
        )

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()
        assert response_json['id'] == str(owner_datasource.id)
        assert response_json['name'] == owner_datasource.name

    def test_02_datasources_retrieve_foreign_record_returns_404(
        self,
        user_client,
        foreign_datasource,
    ):
        """Пользователь обращается к конкретному ошибочному Datasource."""
        response = user_client.get(
            self.URL_DATASOURCES_ID.format(datasource_id=foreign_datasource.id)
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        assert isinstance(response.json(), dict)

    def test_02_datasources_delete_owner_record(
        self,
        user_client,
        owner_datasource,
    ):
        """Пользователь удаляет Datasource."""
        response = user_client.delete(
            self.URL_DATASOURCES_ID.format(datasource_id=owner_datasource.id)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not DataSource.objects.filter(id=owner_datasource.id).exists()

    def test_02_datasources_create_from_source_file_success(
        self,
        user_client,
        user,
        owner_source_file,
        celery_task_eager,
    ):
        """Успешное создание DataSource из SourceFile."""
        response = user_client.post(
            self.URL_DATASOURCES,
            data={
                'source_file_id': owner_source_file.id,
                'sheet_name': 'default',
            },
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        created_id = response.json()['id']

        ds = DataSource.objects.get(id=created_id)
        assert ds.owner.pk == user.pk
        assert ds.source_type == DataSource.SourceType.FILE
        assert ds.source_file_id == owner_source_file.id
        assert ds.status == DataSource.Status.READY, ds.error_message
        assert ds.parquet_file
        assert ds.row_count == 3
        assert ds.column_count == 3

    def test_02_datasources_create_from_xlsx_specific_sheet_success(
        self,
        user_client,
        user,
        datasource_media_root,
        multi_sheet_xlsx_upload_file,
        celery_task_eager,
    ):
        """Создание DataSource из конкретного листа XLSX."""
        # 1. Загружаем файл
        sf_resp = user_client.post(self.URL_FILES, data={'file': multi_sheet_xlsx_upload_file}, format='multipart')
        sf_id = sf_resp.json()['id']

        # 2. Создаем DataSource из конкретного листа "orders"
        response = user_client.post(
            self.URL_DATASOURCES,
            data={'source_file_id': sf_id, 'sheet_name': 'orders'},
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        ds = DataSource.objects.get(id=response.json()['id'])
        
        assert ds.sheet_name == 'orders'
        assert ds.status == DataSource.Status.READY
        assert ds.row_count == 3
        assert [col['name'] for col in ds.columns_meta] == ['id', 'name', 'amount']

        preview_response = user_client.get(
            self.URL_DATASOURCES_PREVIEW.format(datasource_id=ds.id) + '?limit=5'
        )
        assert preview_response.status_code == HTTPStatus.OK
        preview_json = preview_response.json()
        assert preview_json['columns'] == ['id', 'name', 'amount']
        assert preview_json['data'][-1] == {'id': 30, 'name': 'Chair', 'amount': 1.0}

    def test_02_datasources_create_missing_sheet_sets_error_in_celery(
        self,
        user_client,
        user,
        datasource_media_root,
        multi_sheet_xlsx_upload_file,
        celery_task_eager,
    ):
        """Если запрошен несуществующий лист, статус DataSource должен стать ERROR."""
        sf_resp = user_client.post(self.URL_FILES, data={'file': multi_sheet_xlsx_upload_file}, format='multipart')
        sf_id = sf_resp.json()['id']

        response = user_client.post(
            self.URL_DATASOURCES,
            data={'source_file_id': sf_id, 'sheet_name': 'missing_sheet'},
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        ds = DataSource.objects.get(id=response.json()['id'])

        assert ds.sheet_name == 'missing_sheet'
        assert ds.status == DataSource.Status.ERROR
        assert not ds.parquet_file
        assert 'missing_sheet' in ds.error_message

    def test_02_datasources_connect_db_success(
        self,
        user_client,
        user,
        valid_connect_db_payload,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        response = user_client.post(
            self.URL_DATASOURCES_CONNECT_DB,
            data=valid_connect_db_payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        created_id = response.json()['id']
        ds = DataSource.objects.get(id=created_id)

        assert ds.owner.pk == user.pk
        assert ds.source_type == DataSource.SourceType.DATABASE
        assert ds.db_table == valid_connect_db_payload['db_table']
        assert called_ids == [str(ds.id)]

    def test_02_datasources_connect_db_missing_required_field_returns_400(
        self,
        user_client,
        valid_connect_db_payload,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        invalid_payload = valid_connect_db_payload.copy()
        invalid_payload.pop('db_host')

        response = user_client.post(
            self.URL_DATASOURCES_CONNECT_DB,
            data=invalid_payload,
            format='json',
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert 'db_host' in response.json()
        assert called_ids == []

    def test_02_datasources_preview_ready_success(
        self,
        user_client,
        datasource_media_root,
        ready_datasource,
    ):
        response = user_client.get(
            self.URL_DATASOURCES_PREVIEW.format(
                datasource_id=ready_datasource.id,
            ) + '?limit=2'
        )

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()

        assert response_json['preview_rows'] == 2
        assert response_json['total_rows'] == 3
        assert response_json['columns'] == ['id', 'name', 'amount']
        assert len(response_json['data']) == 2

    def test_02_datasources_preview_not_ready_returns_409(
        self,
        user_client,
        pending_datasource,
    ):
        response = user_client.get(
            self.URL_DATASOURCES_PREVIEW.format(
                datasource_id=pending_datasource.id,
            )
        )

        assert response.status_code == HTTPStatus.CONFLICT
        assert isinstance(response.json(), dict)

    def test_02_datasources_preview_ready_without_parquet_returns_409(
        self,
        user_client,
        owner_datasource,
    ):
        owner_datasource.status = DataSource.Status.READY
        owner_datasource.save(update_fields=['status'])

        response = user_client.get(
            self.URL_DATASOURCES_PREVIEW.format(
                datasource_id=owner_datasource.id,
            )
        )

        assert response.status_code == HTTPStatus.CONFLICT


    @pytest.mark.parametrize(
        ('file_fixture_name', 'expected_error_part'),
        [
            ('empty_headers_upload_file', 'Файл не содержит данных.'),
            ('malformed_upload_file', 'Ошибка чтения файла:'),
        ],
    )
    def test_02_datasources_create_empty_and_malformed_fail_in_celery(
        self,
        user_client,
        user,
        datasource_media_root,
        request,
        file_fixture_name,
        expected_error_part,
        celery_task_eager,
    ):
        """
        Пустой и битый CSV загружаются в SourceFile, 
        создают DataSource, но обработка DataSource завершается ошибкой.
        """
        upload_file = request.getfixturevalue(file_fixture_name)
        
        # 1. Загрузка файла (SourceFile может распарсить имя, в том числе ошибочно для бинарника)
        sf_resp = user_client.post(self.URL_FILES, data={'file': upload_file}, format='multipart')
        assert sf_resp.status_code == HTTPStatus.CREATED
        sf_id = sf_resp.json()['id']

        # 2. Создание DataSource
        response = user_client.post(
            self.URL_DATASOURCES,
            data={'source_file_id': sf_id, 'sheet_name': 'default'},
            format='json',
        )

        assert response.status_code == HTTPStatus.CREATED
        ds = DataSource.objects.get(id=response.json()['id'])

        assert ds.owner.pk == user.pk
        assert ds.status == DataSource.Status.ERROR
        assert not ds.parquet_file
        assert expected_error_part in ds.error_message
