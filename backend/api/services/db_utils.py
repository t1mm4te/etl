from __future__ import annotations

SUPPORTED_DB_ENGINES = {
    'postgresql': 'postgresql+psycopg2',
    'mysql': 'mysql+pymysql',
}

POSTGRES_DB_OPTIONS = {
    'sslmode',
    'channel_binding',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'sslcrl',
    'sslminprotocolversion',
    'sslmaxprotocolversion',
    'connect_timeout',
    'application_name',
    'options',
    'target_session_attrs',
    'gssencmode',
    'krbsrvname',
}

MYSQL_DB_OPTIONS = {
    'ssl_ca',
    'ssl_cert',
    'ssl_key',
    'ssl_verify_cert',
    'ssl_verify_identity',
    'connect_timeout',
    'read_timeout',
    'write_timeout',
    'charset',
    'collation',
    'init_command',
}

ENGINE_OPTION_ALLOWLIST = {
    'postgresql': POSTGRES_DB_OPTIONS,
    'mysql': MYSQL_DB_OPTIONS,
}


def resolve_db_engine(value: str) -> str:
    if not value:
        raise ValueError('db_engine не указан.')

    normalized = value.strip().lower()
    if normalized not in SUPPORTED_DB_ENGINES:
        allowed = ', '.join(sorted(SUPPORTED_DB_ENGINES.keys()))
        raise ValueError(
            f'Неподдерживаемый db_engine: {value}. Допустимые: {allowed}'
        )

    return SUPPORTED_DB_ENGINES[normalized]


def normalize_db_options(engine: str, options: dict | None) -> dict[str, str]:
    if not options:
        return {}

    if not isinstance(options, dict):
        raise ValueError('db_options должен быть объектом.')

    normalized_engine = (engine or '').strip().lower()
    if normalized_engine not in ENGINE_OPTION_ALLOWLIST:
        allowed = ', '.join(sorted(SUPPORTED_DB_ENGINES.keys()))
        raise ValueError(
            f'Неподдерживаемый db_engine: {engine}. Допустимые: {allowed}'
        )

    allowed_keys = ENGINE_OPTION_ALLOWLIST[normalized_engine]
    unknown = sorted(k for k in options.keys() if k not in allowed_keys)
    if unknown:
        raise ValueError(
            'Неподдерживаемые параметры подключения: '
            f'{", ".join(unknown)}.'
        )

    normalized: dict[str, str] = {}
    for key, value in options.items():
        if value is None:
            continue
        normalized[str(key)] = str(value)

    return normalized
