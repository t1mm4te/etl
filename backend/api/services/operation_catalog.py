"""
Каталог операций для фронтенд-панели «Добавить шаг».

Содержит UI-метаданные: категории, описания, информацию о входных
портах и JSON Schema конфигурации каждой операции.
Исполняемый код операций находится в ``operations.py``.
"""

from __future__ import annotations


#  Категории

CATEGORIES: dict[str, dict] = {
    'extract': {
        'label': 'Источники',
        'description': 'Загрузка данных из файлов и баз данных.',
        'icon': 'database',
        'order': 1,
    },
    'rows': {
        'label': 'Строки',
        'description': 'Фильтрация, сортировка и дедупликация строк.',
        'icon': 'rows',
        'order': 2,
    },
    'columns': {
        'label': 'Столбцы',
        'description': 'Выбор, переименование, разделение и объединение столбцов.',
        'icon': 'columns',
        'order': 3,
    },
    'tables': {
        'label': 'Таблицы',
        'description': 'Объединение (JOIN) нескольких таблиц.',
        'icon': 'table',
        'order': 4,
    },
    'calculate': {
        'label': 'Вычисления',
        'description': 'Агрегации, группировки, приведение типов, заполнение пропусков.',
        'icon': 'calculator',
        'order': 5,
    },
    'load': {
        'label': 'Выгрузка',
        'description': 'Экспорт результатов в файл.',
        'icon': 'download',
        'order': 6,
    },
}

# Каталог операций

OPERATION_CATALOG: list[dict] = [
    # Extract
    {
        'type': 'source_file',
        'label': 'Загрузка из файла',
        'description': (
            'Считывает данные из ранее загруженного файла '
            '(CSV/XLSX/Parquet). Используйте DataSource API для загрузки.'
        ),
        'category': 'extract',
        'num_inputs': 0,
        'input_ports': [],
        'config_schema': {
            'type': 'object',
            'required': ['datasource_id'],
            'properties': {
                'datasource_id': {
                    'type': 'string',
                    'format': 'uuid',
                    'title': 'Источник данных',
                    'description': 'UUID загруженного DataSource.',
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'source_db',
        'label': 'Загрузка из БД',
        'description': (
            'Считывает таблицу из подключённой внешней базы данных. '
            'Укажите DataSource с типом «database».'
        ),
        'category': 'extract',
        'num_inputs': 0,
        'input_ports': [],
        'config_schema': {
            'type': 'object',
            'required': ['datasource_id'],
            'properties': {
                'datasource_id': {
                    'type': 'string',
                    'format': 'uuid',
                    'title': 'Источник данных',
                    'description': 'UUID подключения DataSource (type=database).',
                },
            },
            'additionalProperties': False,
        },
    },

    # Rows
    {
        'type': 'filter_rows',
        'label': 'Фильтрация строк',
        'description': (
            'Оставляет только строки, соответствующие условию. '
            'Поддерживаются операторы сравнения, contains, is_null и др.'
        ),
        'category': 'rows',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['column', 'operator'],
            'properties': {
                'column': {
                    'type': 'string',
                    'title': 'Столбец',
                    'description': 'Имя столбца для фильтрации.',
                },
                'operator': {
                    'type': 'string',
                    'title': 'Оператор',
                    'enum': [
                        '==', '!=', '>', '<', '>=', '<=',
                        'contains', 'not_contains',
                        'is_null', 'is_not_null',
                    ],
                    'description': 'Оператор сравнения.',
                },
                'value': {
                    'title': 'Значение',
                    'description': (
                        'Значение для сравнения. Не требуется для '
                        'is_null / is_not_null.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'sort',
        'label': 'Сортировка',
        'description': (
            'Сортирует строки по одному или нескольким столбцам '
            'в произвольном порядке (по возрастанию / убыванию).'
        ),
        'category': 'rows',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['by'],
            'properties': {
                'by': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'minItems': 1,
                    'title': 'Столбцы сортировки',
                    'description': 'Список столбцов для сортировки.',
                },
                'ascending': {
                    'oneOf': [
                        {'type': 'boolean'},
                        {
                            'type': 'array',
                            'items': {'type': 'boolean'},
                        },
                    ],
                    'title': 'По возрастанию',
                    'description': (
                        'true — по возрастанию, false — по убыванию. '
                        'Можно указать массив для каждого столбца.'
                    ),
                    'default': True,
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'deduplicate',
        'label': 'Удаление дубликатов',
        'description': (
            'Удаляет повторяющиеся строки. Можно указать подмножество '
            'столбцов и какую строку из группы дубликатов оставить.'
        ),
        'category': 'rows',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'properties': {
                'subset': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'title': 'Столбцы',
                    'description': (
                        'Столбцы для проверки дубликатов. '
                        'Если не указано — все столбцы.'
                    ),
                },
                'keep': {
                    'type': 'string',
                    'enum': ['first', 'last', False],
                    'title': 'Оставить',
                    'description': (
                        'first — первую, last — последнюю, '
                        'false — удалить все дубликаты.'
                    ),
                    'default': 'first',
                },
            },
            'additionalProperties': False,
        },
    },

    # Columns
    {
        'type': 'select_columns',
        'label': 'Выбор столбцов',
        'description': (
            'Оставляет только указанные столбцы в заданном порядке. '
            'Остальные столбцы будут удалены.'
        ),
        'category': 'columns',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['columns'],
            'properties': {
                'columns': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'minItems': 1,
                    'title': 'Столбцы',
                    'description': 'Список столбцов для вывода.',
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'rename_columns',
        'label': 'Переименование столбцов',
        'description': (
            'Переименовывает один или несколько столбцов. '
            'Укажите словарь старое → новое имя.'
        ),
        'category': 'columns',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['mapping'],
            'properties': {
                'mapping': {
                    'type': 'object',
                    'additionalProperties': {'type': 'string'},
                    'title': 'Соответствие',
                    'description': (
                        'Словарь {"старое_имя": "новое_имя", …}.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'split_column',
        'label': 'Разделение столбца',
        'description': (
            'Разбивает столбец на несколько по разделителю. '
            'Например, "Иванов Пётр" → first="Иванов", last="Пётр".'
        ),
        'category': 'columns',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['column'],
            'properties': {
                'column': {
                    'type': 'string',
                    'title': 'Столбец',
                    'description': 'Имя разбиваемого столбца.',
                },
                'separator': {
                    'type': 'string',
                    'title': 'Разделитель',
                    'description': 'Символ-разделитель.',
                    'default': ',',
                },
                'new_columns': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'title': 'Новые столбцы',
                    'description': (
                        'Имена новых столбцов. Если не указано — '
                        'будут сгенерированы автоматически.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'merge_columns',
        'label': 'Объединение столбцов',
        'description': (
            'Склеивает значения нескольких столбцов в один через разделитель. '
            'Например, first + last → "Иванов Пётр".'
        ),
        'category': 'columns',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['columns', 'new_column'],
            'properties': {
                'columns': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'minItems': 2,
                    'title': 'Столбцы',
                    'description': 'Столбцы для склеивания.',
                },
                'separator': {
                    'type': 'string',
                    'title': 'Разделитель',
                    'description': 'Строка-разделитель между значениями.',
                    'default': ' ',
                },
                'new_column': {
                    'type': 'string',
                    'title': 'Новый столбец',
                    'description': 'Имя результирующего столбца.',
                },
            },
            'additionalProperties': False,
        },
    },

    # Tables
    {
        'type': 'join',
        'label': 'Объединение таблиц (JOIN)',
        'description': (
            'Соединяет две таблицы по ключевым столбцам. '
            'Поддерживает inner, left, right и outer join.'
        ),
        'category': 'tables',
        'num_inputs': 2,
        'input_ports': ['left', 'right'],
        'config_schema': {
            'type': 'object',
            'required': ['left_on', 'right_on'],
            'properties': {
                'how': {
                    'type': 'string',
                    'enum': ['inner', 'left', 'right', 'outer'],
                    'title': 'Тип соединения',
                    'description': 'Стратегия объединения строк.',
                    'default': 'inner',
                },
                'left_on': {
                    'type': 'string',
                    'title': 'Ключ левой таблицы',
                    'description': 'Столбец левой таблицы для соединения.',
                },
                'right_on': {
                    'type': 'string',
                    'title': 'Ключ правой таблицы',
                    'description': 'Столбец правой таблицы для соединения.',
                },
            },
            'additionalProperties': False,
        },
    },

    # Calculate
    {
        'type': 'aggregate',
        'label': 'Группировка и агрегация',
        'description': (
            'Группирует строки и считает агрегаты: sum, count, mean, '
            'min, max и другие.'
        ),
        'category': 'calculate',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['group_by', 'aggregations'],
            'properties': {
                'group_by': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'minItems': 1,
                    'title': 'Группировка',
                    'description': 'Столбцы для группировки.',
                },
                'aggregations': {
                    'type': 'object',
                    'additionalProperties': {
                        'type': 'string',
                        'enum': [
                            'sum', 'mean', 'median', 'min', 'max',
                            'count', 'first', 'last', 'std', 'var',
                        ],
                    },
                    'title': 'Агрегации',
                    'description': (
                        'Словарь {"столбец": "функция", …}.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'cast_types',
        'label': 'Приведение типов',
        'description': (
            'Меняет типы данных столбцов: int64, float64, str, '
            'datetime64[ns], bool и др.'
        ),
        'category': 'calculate',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['mapping'],
            'properties': {
                'mapping': {
                    'type': 'object',
                    'additionalProperties': {
                        'type': 'string',
                        'enum': [
                            'int64', 'float64', 'str', 'bool',
                            'datetime64[ns]', 'category',
                        ],
                    },
                    'title': 'Соответствие',
                    'description': (
                        'Словарь {"столбец": "тип", …}.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'computed_column',
        'label': 'Вычисляемый столбец',
        'description': (
            'Создаёт новый столбец на основе арифметического выражения '
            'над существующими. Например: price * quantity.'
        ),
        'category': 'calculate',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['new_column', 'expression'],
            'properties': {
                'new_column': {
                    'type': 'string',
                    'title': 'Имя нового столбца',
                    'description': 'Название создаваемого столбца.',
                },
                'expression': {
                    'type': 'string',
                    'title': 'Выражение',
                    'description': (
                        'Арифметическое выражение (pd.eval). '
                        'Пример: price * quantity.'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },
    {
        'type': 'fill_missing',
        'label': 'Заполнение пропусков',
        'description': (
            'Обработка пропущенных значений (NaN). Можно заполнить '
            'константой, средним, медианой, модой или удалить строки.'
        ),
        'category': 'calculate',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['strategy'],
            'properties': {
                'strategy': {
                    'type': 'string',
                    'enum': [
                        'value', 'ffill', 'bfill',
                        'mean', 'median', 'mode', 'drop',
                    ],
                    'title': 'Стратегия',
                    'description': (
                        'value — подставить fill_value; ffill/bfill — '
                        'вперёд/назад; mean/median/mode — статистика; '
                        'drop — удалить строки с пропусками.'
                    ),
                },
                'columns': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'title': 'Столбцы',
                    'description': (
                        'Столбцы для обработки. Если не указано — все.'
                    ),
                },
                'fill_value': {
                    'title': 'Значение заполнения',
                    'description': (
                        'Значение для стратегии "value".'
                    ),
                },
            },
            'additionalProperties': False,
        },
    },

    # Load
    {
        'type': 'export_file',
        'label': 'Экспорт в файл',
        'description': (
            'Сохраняет результат в файл. Поддерживаемые форматы: '
            'CSV, XLSX, Parquet.'
        ),
        'category': 'load',
        'num_inputs': 1,
        'input_ports': ['main'],
        'config_schema': {
            'type': 'object',
            'required': ['format'],
            'properties': {
                'format': {
                    'type': 'string',
                    'enum': ['csv', 'xlsx', 'parquet'],
                    'title': 'Формат',
                    'description': 'Формат выходного файла.',
                },
            },
            'additionalProperties': False,
        },
    },
]


# Вспомогательные функции

_CATALOG_INDEX: dict[str, dict] = {op['type']: op for op in OPERATION_CATALOG}


def get_catalog() -> list[dict]:
    """Полный каталог операций (для API-ответа)."""
    return OPERATION_CATALOG


def get_operation_meta(op_type: str) -> dict | None:
    """Метаданные одной операции по типу."""
    return _CATALOG_INDEX.get(op_type)


def get_categories() -> dict[str, dict]:
    """Словарь категорий (для API-ответа)."""
    return CATEGORIES
