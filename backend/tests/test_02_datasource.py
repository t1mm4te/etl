from http import HTTPStatus

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from api.serializers import DataSourceDBSerializer, DataSourceUploadSerializer
from core.models import DataSource


@pytest.mark.django_db(transaction=True)
class Test02DataSourceAPI:
    URL_DATASOURCES = '/api/v1/datasources/'
    URL_DATASOURCES_UPLOAD = '/api/v1/datasources/upload/'
    URL_DATASOURCES_CONNECT_DB = '/api/v1/datasources/connect-db/'

    def test_02_datasources_list_returns_only_owner_records(
        self,
        user_client,
        owner_datasource,
        foreign_datasource,
    ):
        response = user_client.get(self.URL_DATASOURCES)

        assert response.status_code == HTTPStatus.OK
        response_json = response.json()
        assert isinstance(response_json, dict)

        results = response_json.get('results', [])
        result_ids = {item['id'] for item in results}

        assert str(owner_datasource.id) in result_ids
        assert str(foreign_datasource.id) not in result_ids

    def test_02_datasources_retrieve_owner_record(
        self,
        user_client,
        owner_datasource,
    ):
        response = user_client.get(
            f'{self.URL_DATASOURCES}{owner_datasource.id}/'
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
        response = user_client.get(
            f'{self.URL_DATASOURCES}{foreign_datasource.id}/'
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        assert isinstance(response.json(), dict)

    def test_02_datasources_delete_owner_record(
        self,
        user_client,
        owner_datasource,
    ):
        response = user_client.delete(
            f'{self.URL_DATASOURCES}{owner_datasource.id}/'
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not DataSource.objects.filter(id=owner_datasource.id).exists()

    def test_02_datasources_upload_csv_success(
        self,
        user_client,
        user,
        datasource_media_root,
        minimal_csv_upload_file,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        response = user_client.post(
            self.URL_DATASOURCES_UPLOAD,
            data={
                'file': minimal_csv_upload_file,
                'name': 'CSV source',
            },
            format='multipart',
        )

        assert response.status_code == HTTPStatus.CREATED
        response_json = response.json()
        created_id = response_json['id']

        ds = DataSource.objects.get(id=created_id)
        assert ds.owner.pk == user.pk
        assert ds.source_type == DataSource.SourceType.FILE
        assert ds.status == DataSource.Status.PENDING
        assert ds.original_filename == 'minimal_valid.csv'
        assert called_ids == [str(ds.id)]

    def test_02_datasources_upload_xlsx_success(
        self,
        user_client,
        datasource_media_root,
        minimal_xlsx_upload_file,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        response = user_client.post(
            self.URL_DATASOURCES_UPLOAD,
            data={'file': minimal_xlsx_upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.CREATED
        created_id = response.json()['id']
        ds = DataSource.objects.get(id=created_id)

        assert ds.original_filename == 'minimal_valid.xlsx'
        assert called_ids == [str(ds.id)]

    def test_02_datasources_upload_unsupported_extension_returns_400(
        self,
        user_client,
        unsupported_upload_file,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        response = user_client.post(
            self.URL_DATASOURCES_UPLOAD,
            data={'file': unsupported_upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert 'file' in response.json()
        assert called_ids == []

    @pytest.mark.parametrize(
        'file_fixture_name',
        ['empty_headers_upload_file', 'malformed_upload_file'],
    )
    def test_02_upload_empty_and_malformed_are_accepted_at_api_level(
        self,
        user_client,
        datasource_media_root,
        request,
        file_fixture_name,
        monkeypatch,
    ):
        called_ids = []

        def _delay_mock(datasource_id):
            called_ids.append(datasource_id)

        monkeypatch.setattr('api.views.process_datasource.delay', _delay_mock)

        upload_file = request.getfixturevalue(file_fixture_name)
        response = user_client.post(
            self.URL_DATASOURCES_UPLOAD,
            data={'file': upload_file},
            format='multipart',
        )

        assert response.status_code == HTTPStatus.CREATED
        assert len(called_ids) == 1

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
            f'{self.URL_DATASOURCES}{ready_datasource.id}/preview/?limit=2'
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
            f'{self.URL_DATASOURCES}{pending_datasource.id}/preview/'
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
            f'{self.URL_DATASOURCES}{owner_datasource.id}/preview/'
        )

        assert response.status_code == HTTPStatus.CONFLICT
        assert isinstance(response.json(), dict)


class Test02DataSourceSerializers:
    def test_02_upload_serializer_rejects_unsupported_extension(
        self,
        unsupported_upload_file,
    ):
        serializer = DataSourceUploadSerializer(
            data={'file': unsupported_upload_file}
        )

        assert not serializer.is_valid()
        assert 'file' in serializer.errors

    def test_02_upload_serializer_respects_file_size_limit(self, settings):
        settings.MAX_FILE_SIZE = 4

        oversized_file = SimpleUploadedFile(
            name='small.csv',
            content=b'12345',
            content_type='text/csv',
        )
        serializer = DataSourceUploadSerializer(data={'file': oversized_file})

        assert not serializer.is_valid()
        assert 'file' in serializer.errors

    def test_02_db_serializer_requires_mandatory_fields(
        self,
        valid_connect_db_payload,
    ):
        payload = valid_connect_db_payload.copy()
        payload.pop('db_name')

        serializer = DataSourceDBSerializer(data=payload)

        assert not serializer.is_valid()
        assert 'db_name' in serializer.errors
