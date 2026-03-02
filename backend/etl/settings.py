import json
import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(dotenv_path=BASE_DIR.parent / '.env')

SECRET_KEY = os.getenv('SECRET_KEY')

if not SECRET_KEY:
    raise ValueError('`SECRET_KEY` не может быть None')

debug_value = os.getenv('DEBUG', '').lower()
if debug_value not in ('true', 'false'):
    raise ValueError('Некорректное значение для `DEBUG`')
DEBUG = debug_value == 'true'

hosts = os.getenv('ALLOWED_HOSTS', '')
if hosts == '*':
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = json.loads(hosts)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'djoser',
    'django_filters',
    'drf_spectacular',
    'corsheaders',
    'core',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'etl.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'etl.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', str(BASE_DIR / 'db.sqlite3')),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', ''),
    }
}

AUTH_USER_MODEL = 'core.User'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'ru-RU'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Пользовательские ограничения
USER_LAST_NAME_MAX_LENGTH = 30
USER_FIRST_NAME_MAX_LENGTH = 30
DATASOURCE_MAX_ROWS = 5000

NUMBER_OF_PREVIEW_LINES = 50

DATA_SOURCE_NAME_MAX_LENGTH = 255
DATA_SOURCE_DB_ENGINE_MAX_LENGTH = 50
DB_SPECS_MAX_LENGTH = 255
DATA_SOURCE_TYPE_MAX_LENGTH = 20
DATA_SOURCE_STATUS_MAX_LENGTH = 20

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

PIPELINE_NAME_MAX_LENGTH = 255

NODE_OPERATION_TYPE_MAX_LENGTH = 30
NODE_LABEL_MAX_LENGTH = 100

EDGE_PORT_MAX_LENGTH = 50

PIPELINE_RUN_STATUS_MAX_LENGTH = 20
PIPELINE_RUN_CELERY_TASK_ID_MAX_LENGTH = 20

NODE_RUN_STATUS_MAX_LENGTH = 20


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


SPECTACULAR_SETTINGS = {
    'TITLE': 'ETL No-Code API',
    'DESCRIPTION': (
        'REST API для визуального ETL-инструмента с NO-CODE-подходом.\n\n'
        '## Авторизация\n'
        'Все эндпоинты (кроме `/auth/token/login/`) требуют заголовок:\n'
        '```\nAuthorization: Token <ваш_токен>\n```\n\n'
        '## Основной сценарий\n'
        '1. **Загрузить источник** — `POST /datasources/upload/`\n'
        '2. **Создать пайплайн** — `POST /pipelines/`\n'
        '3. **Добавить узлы** — `POST /pipelines/{id}/nodes/`\n'
        '4. **Связать узлы рёбрами** — `POST /pipelines/{id}/edges/`\n'
        '5. **Запустить** — `POST /pipelines/{id}/run/`\n'
        '6. **Отслеживать статус** — `GET /pipeline-runs/{id}/`\n'
        '7. **Посмотреть результат** — `GET /node-runs/{id}/preview/`'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {
            'name': 'Пользователи',
            'description': 'Пользователи, регистрация, получение и удаление токена (djoser).',
        },
        {
            'name': 'Источники данных',
            'description': (
                'Загрузка файлов (CSV/XLSX), подключение к внешним БД. '
                'Файлы автоматически конвертируются в Parquet.'
            ),
        },
        {
            'name': 'Пайплайны',
            'description': (
                'CRUD пайплайнов — визуальных графов обработки данных. '
                'Пайплайн содержит узлы и рёбра.'
            ),
        },
        {
            'name': 'Узлы пайплайна',
            'description': (
                'Узлы — операции обработки данных внутри пайплайна. '
                'URL: `/pipelines/{pipeline_pk}/nodes/`.'
            ),
        },
        {
            'name': 'Рёбра пайплайна',
            'description': (
                'Рёбра — направленные связи между узлами. '
                'URL: `/pipelines/{pipeline_pk}/edges/`.'
            ),
        },
        {
            'name': 'Запуски пайплайнов',
            'description': (
                'Запуск пайплайна, отслеживание статуса, '
                'предпросмотр результатов отдельных узлов.'
            ),
        },
        {
            'name': 'Операции',
            'description': (
                'Справочник доступных операций для построения пайплайна. '
                'Используйте значение `type` при создании узлов.'
            ),
        },
    ],
    'ENUM_NAME_OVERRIDES': {
        'DataSourceStatusEnum': 'core.models.DataSource.Status',
        'DataSourceSourceTypeEnum': 'core.models.DataSource.SourceType',
        'PipelineRunStatusEnum': 'core.models.PipelineRun.Status',
        'NodeRunStatusEnum': 'core.models.NodeRun.Status',
        'NodeOperationTypeEnum': 'core.models.Node.OperationType',
    },
    'POSTPROCESSING_HOOKS': [
        'api.spectacular_hooks.postprocess_auth_tags',
    ],
}


CORS_ALLOWED_ORIGINS = json.loads(
    os.getenv('CORS_ALLOWED_ORIGINS', '["http://localhost:3000"]')
)
CORS_ALLOW_CREDENTIALS = True


CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv(
    'CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'core': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
        },
    },
}

DJOSER = {
    'SERIALIZERS': {
        'user_create': 'api.serializers.UserCreateSerializer',
        'user': 'api.serializers.UserSerializer',
        'current_user': 'api.serializers.UserSerializer',
    },
    'PERMISSIONS': {
        'user': ['rest_framework.permissions.AllowAny'],
        'user_list': ['rest_framework.permissions.AllowAny'],
    },
    'HIDE_USERS': False,
    'LOGIN_FIELD': 'email',
}
