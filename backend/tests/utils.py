from django.conf import settings


user_required_fields: tuple[str, ...] = (
    'email', 'username', 'first_name', 'last_name', 'password'
)

invalid_data_for_user_fields: tuple[tuple[dict, tuple[str, ...]], ...] = (
    (
        {},
        user_required_fields
    ),
    (
        {
            'email': ('a' * 246) + '@etl.fake',
            'username': 'valid-username',
            'first_name': 'name',
            'last_name': 'name',
            'password': '12345678'
        },
        ('email',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': ('a' * 151),
            'first_name': 'name',
            'last_name': 'name',
            'password': '12345678'
        },
        ('username',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': '|-|aTa|_|_|a',
            'first_name': 'name',
            'last_name': 'name',
            'password': '12345678'
        },
        ('username',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': 'me',
            'first_name': 'name',
            'last_name': 'name',
            'password': '12345678'
        },
        ('username',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': 'valid-username',
            'first_name': ('a' * (settings.USER_FIRST_NAME_MAX_LENGTH + 1)),
            'last_name': 'name',
            'password': '12345678'
        },
        ('first_name',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': 'valid-username',
            'first_name': 'name',
            'last_name': ('a' * (settings.USER_LAST_NAME_MAX_LENGTH + 1)),
            'password': '12345678'
        },
        ('last_name',)
    ),
    (
        {
            'email': 'valid-email@etl.fake',
            'username': 'valid-username',
            'first_name': 'name',
            'last_name': 'name',
            'password': ''
        },
        ('password',)
    ),
)

valid_data_for_user_fields: dict = {
    'email': 'valid@etl.fake',
    'username': 'valid_username',
    'password': 'O1234jkl',
    'first_name': 'valid first_name',
    'last_name': 'valid last_name'
}
