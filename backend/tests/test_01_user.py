from http import HTTPStatus

import pytest

from .utils import get_expected_user, get_expected_users, TEST_IMAGE


@pytest.mark.django_db(transaction=True)
class Test01User:
    URL_USERS = '/api/v1/users/'
    URL_USERS_ID = '/api/v1/users/{id}/'
    URL_USERS_ME = '/api/v1/users/me/'

    def test_01_users(self, client, some_users, django_user_model):
        response = client.get(self.URL_USERS)

        assert response.status_code == HTTPStatus.OK, (
            f'GET-запрос, отправленный на {self.URL_USERS}, должен'
            'возвращать статус 200.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

        results = response_json.get('results')

        expected = get_expected_users(
            django_user_model.objects.all(),
            response=response
        )

        assert results == expected

    def test_01_users_get_by_correct_id(
            self, client, user):
        response = client.get(f'{self.URL_USERS_ID.format(id=user.id)}')

        assert response.status_code == HTTPStatus.OK, (
            f'GET-запрос, отправленный на {self.URL_USERS_ID}, должен'
            'возвращать статус 200.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

        expected = get_expected_user(
            user,
            response=response
        )

        assert response_json == expected

    def test_01_users_get_by_incorrect_id(
            self, client):
        response = client.get(f'{self.URL_USERS_ID.format(id=1234567890)}')

        assert response.status_code == HTTPStatus.NOT_FOUND, (
            f'GET-запрос, отправленный на {self.URL_USERS_ID} '
            'с несуществующим ID, должен возвращать статус 404.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

    def test_01_users_me(
            self, user_client, user):
        response = user_client.get(self.URL_USERS_ME)

        assert response.status_code == HTTPStatus.OK, (
            f'GET-запрос, отправленный на {self.URL_USERS_ME}, должен'
            'возвращать статус 200.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

        expected = get_expected_user(
            user,
            response=response
        )

        assert response_json == expected

    def test_01_users_me_unauthorized(
            self, client):
        response = client.get(self.URL_USERS_ME)

        assert response.status_code == HTTPStatus.UNAUTHORIZED, (
            f'GET-запрос, отправленный на {self.URL_USERS_ME} от '
            'неавторизованного пользователя, должен возвращать статус 401.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)


@pytest.mark.django_db(transaction=True)
class Test01UserMeAvatar:
    URL_USERS_ME_AVATAR = '/api/v1/users/me/avatar/'

    @pytest.mark.parametrize('http_method', ['put', 'delete'])
    def test_01_put_delete_unauthorized(
            self, client, http_method):
        request_method = getattr(client, http_method)

        response = request_method(self.URL_USERS_ME_AVATAR)

        assert response.status_code == HTTPStatus.UNAUTHORIZED, (
            f'{http_method.upper()}-запрос, отправленный на '
            '{self.URL_USERS_ME_AVATAR} от неавторизованного пользователя, '
            'должен возвращать статус 401.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

    def test_01_put_delete_authorized(
            self, user_client, user):
        # PUT
        response = user_client.put(
            self.URL_USERS_ME_AVATAR,
            {'avatar': TEST_IMAGE}
        )
        print(response.json())
        assert response.status_code == HTTPStatus.OK, (
            f'PUT-запрос, отправленный на {self.URL_USERS_ME_AVATAR}, должен'
            'возвращать статус 200.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

        user.refresh_from_db()
        expected = {
            'avatar': response.wsgi_request.build_absolute_uri(
                user.avatar.url
            )
        }
        assert expected['avatar'] is not None

        assert response_json == expected

        # DELETE
        response = user_client.delete(self.URL_USERS_ME_AVATAR)

        assert response.status_code == HTTPStatus.NO_CONTENT, (
            f'DELETE-запрос, отправленный на {self.URL_USERS_ME_AVATAR}, '
            'должен возвращать статус 204.'
        )

        user.refresh_from_db()
        assert not user.avatar

    def test_01_users_me_avatar_put_authorized_invalid_data(
            self, user_client, user):
        assert not user.avatar

        response = user_client.put(
            self.URL_USERS_ME_AVATAR,
            {'avatar': 'invalid_data'}
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f'PUT-запрос, отправленный на {self.URL_USERS_ME_AVATAR} '
            ' с некорректными данными, должен возвращать статус 400.'
        )
        response_json = response.json()

        assert isinstance(response_json, dict)

        assert not user.avatar
