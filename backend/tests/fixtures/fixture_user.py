import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


@pytest.fixture
def user_superuser(django_user_model):
    return django_user_model.objects.create_superuser(
        username='TestSuperuser',
        email='testsuperuser@etl.fake',
        password='O1234jkl',
        first_name='superuser',
        last_name='superuserov'
    )


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        username='TestAdmin',
        email='testadmin@etl.fake',
        password='O1234jkl',
        first_name='admin',
        last_name='adminov',
        is_staff=True
    )


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        username='TestUser',
        email='testuser@etl.fake',
        password='O1234jkl',
        first_name='user',
        last_name='userov'
    )


@pytest.fixture
def token_user_superuser(user_superuser):
    token, _ = Token.objects.get_or_create(user=user_superuser)
    return {
        'access': token.key,
    }


@pytest.fixture
def user_superuser_client(token_user_superuser):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Token {token_user_superuser["access"]}'
    )
    return client


@pytest.fixture
def token_admin(admin):
    token, _ = Token.objects.get_or_create(user=admin)
    return {
        'access': token.key,
    }


@pytest.fixture
def admin_client(token_admin):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token_admin["access"]}')
    return client


@pytest.fixture
def token_user(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {
        'access': token.key,
    }


@pytest.fixture
def user_client(token_user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token_user["access"]}')
    return client
