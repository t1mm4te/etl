from http import HTTPStatus

import pytest

from tests.utils import (
    invalid_data_for_user_fields,
    valid_data_for_user_fields,
    valid_data_for_user_login,
    invalid_data_for_user_login,
)


@pytest.mark.django_db(transaction=True)
class Test00UserRegistration:
    URL_SIGNUP = '/api/v1/users/'
    URL_SET_PASSWORD = '/api/v1/users/set_password/'
    URL_LOGIN = '/api/v1/auth/token/login/'

    @pytest.mark.parametrize(
        'data,invalid_fields', invalid_data_for_user_fields
    )
    def test_00_singup_length_and_symbols_validation(
            self,
            client,
            django_user_model,
            data,
            invalid_fields
    ):
        users_count = django_user_model.objects.count()
        response = client.post(self.URL_SIGNUP, data=data)
        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f'Принимаются неправильные данные на {self.URL_SIGNUP}: {data}'
        )
        assert django_user_model.objects.count() == users_count, (
            f'Если в POST-запросе к эндпоинту `{self.URL_SIGNUP}` '
            'значения полей не соответствуют ограничениям по длине или '
            'содержанию - новый пользователь не должен быть создан.'
        )
        response_json = response.json()
        assert len(response_json) == len(invalid_fields)
        for field in invalid_fields:
            assert (field in response_json
                    and isinstance(response_json.get(field), list)), (
                f'Если в POST-запросе к `{self.URL_SIGNUP}` не переданы '
                'необходимые данные или эти данные некорректны, в ответе '
                'должна возвращаться информация об этих полях.'
            )

    def test_00_valid_data_user_signup(self, client, django_user_model):
        response = client.post(self.URL_SIGNUP,
                               data=valid_data_for_user_fields)

        assert response.status_code != HTTPStatus.NOT_FOUND, (
            f'Эндпоинт `{self.URL_SIGNUP}` не найден. Проверьте настройки '
            'в *urls.py*.'
        )

        assert response.status_code == HTTPStatus.CREATED, (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен вернуть ответ со статусом 201.'
        )

        response_json = response.json()
        response_id = response_json.get('id')
        assert response_id is not None, (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен вернуть ответ с `id`.'
            f'{response_json}'
        )

        expected_value = valid_data_for_user_fields.copy()
        del expected_value['password']
        expected_value['id'] = response_id
        assert response_json == expected_value, (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен вернуть ответ, содержащий '
            'информацию о `username`, `email`, `first_name`, `last_name`, '
            '`id` созданного пользователя.'
        )

        new_user = django_user_model.objects.filter(
            email=valid_data_for_user_fields['email'])
        assert new_user.exists(), (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен создать нового пользователя.'
        )

        new_user.delete()

    def test_00_valid_data_user_login(self, client, django_user_model):
        django_user_model.objects.create_user(**valid_data_for_user_fields)
        response = client.post(self.URL_LOGIN,
                               data=valid_data_for_user_login)

        assert response.status_code != HTTPStatus.NOT_FOUND, (
            f'Эндпоинт `{self.URL_SIGNUP}` не найден. Проверьте настройки '
            'в *urls.py*.'
        )

        assert response.status_code == HTTPStatus.OK, (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен вернуть ответ со статусом 200.'
        )

        response_json = response.json()

        assert response_json.get('auth_token') is not None, (
            'POST-запрос с корректными данными, отправленный на эндпоинт '
            f'`{self.URL_SIGNUP}`, должен вернуть ответ с `id`.'
            f'{response_json}'
        )

    @pytest.mark.parametrize(
        'data,invalid_fields', invalid_data_for_user_login
    )
    def test_00_unsuccessful_login(
            self,
            client,
            django_user_model,
            data,
            invalid_fields
    ):
        django_user_model.objects.create_user(**valid_data_for_user_fields)

        response = client.post(self.URL_LOGIN, data=data)
        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f'Принимаются неправильные данные на {self.URL_SIGNUP}: {data}. '
            f'Поля с ошибками: {invalid_fields}'
        )

        response_json = response.json()
        assert len(response_json) == 1
        assert response_json.get('non_field_errors') is not None
