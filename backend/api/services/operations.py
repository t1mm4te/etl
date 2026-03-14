"""
Реестр операций над данными (Transform-слой).

Каждая операция — функция вида:

    def operation(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame

``inputs``: словарь {port_name: DataFrame}, где ``port_name`` — имя входного
порта (``"main"`` для операций с одним входом, ``"left"``/``"right"`` для JOIN).

``config``: JSON-конфигурация узла.
"""

from __future__ import annotations

import logging
from typing import Callable

import pandas as pd


logger = logging.getLogger(__name__)

OperationFn = Callable[[dict[str, pd.DataFrame], dict], pd.DataFrame]
_REGISTRY: dict[str, OperationFn] = {}


def register(op_type: str):
    """Декоратор для регистрации операции в реестре."""
    def decorator(fn: OperationFn) -> OperationFn:
        _REGISTRY[op_type] = fn
        return fn
    return decorator


def get_operation(op_type: str) -> OperationFn:
    """Возвращает функцию-операцию по типу или поднимает ошибку."""
    if op_type not in _REGISTRY:
        raise ValueError(f'Неизвестный тип операции: {op_type}')
    return _REGISTRY[op_type]


# ──────────────────────────────────────────────────────────
#  Extract-операции
# ──────────────────────────────────────────────────────────

@register('source_file')
def source_file(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Загрузка DataSource (parquet).
    config: {"datasource_id": "<uuid>"}
    """
    from core.models import DataSource
    ds = DataSource.objects.get(pk=config['datasource_id'])
    return pd.read_parquet(ds.parquet_file.path, engine='pyarrow')


@register('source_db')
def source_db(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Загрузка из внешней БД.
    config: {"datasource_id": "<uuid>"}
    """
    from sqlalchemy import create_engine

    from core.models import DataSource

    ds = DataSource.objects.get(pk=config['datasource_id'])
    url = (
        f'{ds.db_engine}://{ds.db_user}:{ds.db_password}'
        f'@{ds.db_host}:{ds.db_port}/{ds.db_name}'
    )
    engine = create_engine(url)
    table = ds.db_table
    schema = ds.db_schema or None
    return pd.read_sql_table(table, engine, schema=schema)


# Transform-операции

@register('filter_rows')
def filter_rows(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Фильтрация строк по условию.
    config: {"column": "age", "operator": ">", "value": 18}
    Поддерживаемые операторы: ==, !=, >, <, >=, <=, contains, not_contains,
                               is_null, is_not_null
    """
    df = inputs['main'].copy()
    col = config['column']
    op = config['operator']
    val = config.get('value')

    ops = {
        '==': lambda s, v: s == v,
        '!=': lambda s, v: s != v,
        '>': lambda s, v: s > v,
        '<': lambda s, v: s < v,
        '>=': lambda s, v: s >= v,
        '<=': lambda s, v: s <= v,
        'contains': lambda s, v: s.astype(str).str.contains(str(v), na=False),
        'not_contains': lambda s, v: ~s.astype(str).str.contains(str(v), na=False),
        'is_null': lambda s, v: s.isna(),
        'is_not_null': lambda s, v: s.notna(),
    }
    if op not in ops:
        raise ValueError(f'Неизвестный оператор: {op}')
    mask = ops[op](df[col], val)
    return df.loc[mask].reset_index(drop=True)


@register('select_columns')
def select_columns(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Выбор и переупорядочение столбцов.
    config: {"columns": ["name", "age", "city"]}
    """
    df = inputs['main']
    return df[config['columns']].copy()


@register('rename_columns')
def rename_columns(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Переименование столбцов.
    config: {"mapping": {"old_name": "new_name", ...}}
    """
    df = inputs['main'].copy()
    return df.rename(columns=config['mapping'])


@register('sort')
def sort_rows(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Сортировка строк.
    config: {"by": ["col1", "col2"], "ascending": [true, false]}
    """
    df = inputs['main'].copy()
    return df.sort_values(
        by=config['by'],
        ascending=config.get('ascending', True),
    ).reset_index(drop=True)


@register('join')
def join_tables(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Объединение двух таблиц.
    config: {
        "how": "inner",        # inner / left / right / outer
        "left_on": "id",
        "right_on": "user_id"
    }
    Входы: inputs["left"], inputs["right"]
    """
    left = inputs.get('left', inputs.get('main'))
    right = inputs['right']
    return pd.merge(
        left,
        right,
        how=config.get('how', 'inner'),
        left_on=config['left_on'],
        right_on=config['right_on'],
    )


@register('aggregate')
def aggregate(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Группировка + агрегация.
    config: {
        "group_by": ["city"],
        "aggregations": {"amount": "sum", "id": "count"}
    }
    """
    df = inputs['main']
    return (
        df
        .groupby(config['group_by'], as_index=False)
        .agg(config['aggregations'])
    )


@register('cast_types')
def cast_types(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Приведение типов столбцов.
    config: {"mapping": {"age": "int64", "price": "float64", "date": "datetime64[ns]"}}
    """
    df = inputs['main'].copy()
    for col, dtype in config['mapping'].items():
        if 'datetime' in dtype:
            df[col] = pd.to_datetime(df[col], errors='coerce')
        else:
            df[col] = df[col].astype(dtype)
    return df


@register('computed_column')
def computed_column(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Добавление вычисляемого столбца.
    config: {"new_column": "total", "expression": "price * quantity"}
    Выражение вычисляется через pd.eval (только арифметика над столбцами).
    """
    df = inputs['main'].copy()
    df[config['new_column']] = df.eval(config['expression'])
    return df


@register('split_column')
def split_column(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Разделение столбца по разделителю.
    config: {
        "column": "full_name",
        "separator": " ",
        "new_columns": ["first", "last"]  # опционально
    }
    """
    df = inputs['main'].copy()
    col = config['column']
    sep = config.get('separator', ',')
    parts = df[col].astype(str).str.split(sep, expand=True)
    new_cols = config.get('new_columns')
    if new_cols:
        for i, name in enumerate(new_cols):
            df[name] = parts[i] if i < parts.shape[1] else None
    else:
        for i in range(parts.shape[1]):
            df[f'{col}_{i}'] = parts[i]
    return df


@register('merge_columns')
def merge_columns(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Слияние нескольких столбцов в один.
    config: {
        "columns": ["first", "last"],
        "separator": " ",
        "new_column": "full_name"
    }
    """
    df = inputs['main'].copy()
    sep = config.get('separator', ' ')
    cols = config['columns']
    df[config['new_column']] = df[cols].astype(str).agg(sep.join, axis=1)
    return df


@register('deduplicate')
def deduplicate(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Удаление дубликатов.
    config: {"subset": ["col1", "col2"], "keep": "first"}
    """
    df = inputs['main'].copy()
    subset = config.get('subset')
    keep = config.get('keep', 'first')
    return df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)


@register('fill_missing')
def fill_missing(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Заполнение пропусков.
    config: {
        "strategy": "value",   # value / ffill / bfill / mean / median / mode / drop
        "columns": ["age"],    # опционально (None = все)
        "fill_value": 0        # только для strategy=value
    }
    """
    df = inputs['main'].copy()
    strategy = config.get('strategy', 'drop')
    columns = config.get('columns')
    target = df[columns] if columns else df

    if strategy == 'value':
        fill_val = config['fill_value']
        if columns:
            df[columns] = target.fillna(fill_val)
        else:
            df = df.fillna(fill_val)
    elif strategy == 'ffill':
        if columns:
            df[columns] = target.ffill()
        else:
            df = df.ffill()
    elif strategy == 'bfill':
        if columns:
            df[columns] = target.bfill()
        else:
            df = df.bfill()
    elif strategy == 'mean':
        if columns:
            df[columns] = target.fillna(target.mean(numeric_only=True))
        else:
            df = df.fillna(df.mean(numeric_only=True))
    elif strategy == 'median':
        if columns:
            df[columns] = target.fillna(target.median(numeric_only=True))
        else:
            df = df.fillna(df.median(numeric_only=True))
    elif strategy == 'mode':
        modes = target.mode().iloc[0] if not target.mode().empty else pd.Series()
        if columns:
            df[columns] = target.fillna(modes)
        else:
            df = df.fillna(modes)
    elif strategy == 'drop':
        df = df.dropna(subset=columns).reset_index(drop=True)
    else:
        raise ValueError(f'Неизвестная стратегия: {strategy}')

    return df


# Load-операции

@register('export_file')
def export_file(inputs: dict[str, pd.DataFrame], config: dict) -> pd.DataFrame:
    """
    Экспорт в файл. Сам экспорт обрабатывается на уровне API.
    Здесь просто прокидываем DataFrame дальше (passthrough).
    config: {"format": "csv"}  # csv / xlsx / parquet
    """
    return inputs['main'].copy()
