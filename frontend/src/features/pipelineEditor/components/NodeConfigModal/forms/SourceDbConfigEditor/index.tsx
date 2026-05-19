import { useCallback, useEffect, useState } from 'react';
import { Input } from '../../../../../../shared/ui/Input';
import { PasswordInput } from '../../../../../../shared/ui/PasswordInput';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Button } from '../../../../../../shared/ui/Button';
import styles from './index.module.scss';
import type { SourceDbConfigEditorProps } from '../types';
import { apiClient } from '../../../../../../shared/api/client';
import { getDatasourceDetail } from '../../../../../../shared/api/pipelines';
import type { DataSourceDetail } from '../../../../../../shared/api/types';

const ENGINE_OPTIONS: SelectOption[] = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
];

export function SourceDbConfigEditor({ datasourceId }: SourceDbConfigEditorProps) {
  const [name, setName] = useState('');
  const [dbEngine, setDbEngine] = useState<SelectOption | null>(ENGINE_OPTIONS[0]);
  const [host, setHost] = useState('');
  const [port, setPort] = useState<string>('');
  const [dbName, setDbName] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DataSourceDetail | null>(null);

  const loadDatasource = useCallback(async () => {
    if (!datasourceId) return;
    try {
      const data = await getDatasourceDetail(datasourceId);
      setResult(data);
      setName(data.name ?? '');
    } catch {
      // ignore
    }
  }, [datasourceId]);

  useEffect(() => {
    void loadDatasource();
  }, [loadDatasource]);

  const handleConnect = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const payload = {
      name: name || undefined,
      db_engine: dbEngine?.value,
      db_host: host || undefined,
      db_port: port ? Number(port) : undefined,
      db_name: dbName || undefined,
      db_user: user || undefined,
      db_password: password || undefined,
    } as Record<string, unknown>;

    try {
      const response = await apiClient.post<DataSourceDetail>('/datasources/connect-db/', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      setResult(response.data);
    } catch (err) {
      const errorDetail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Ошибка подключения';
      setError(errorDetail);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, dbEngine, host, port, dbName, user, password]);

  return (
    <div className={styles.root}>
      <p className={styles.configLabel}>Подключение к БД</p>

      <label className={styles.field}>
        <span className={styles.label}>Название</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Произвольное имя"
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Движок</span>
          <CustomSelect
            options={ENGINE_OPTIONS}
            value={dbEngine}
            onChange={(opt) => setDbEngine((opt as SelectOption) ?? null)}
            isClearable={false}
            isSearchable={false}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Хост</span>
          <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Порт</span>
          <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="5432" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Имя БД</span>
          <Input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="db_name" />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Пользователь</span>
          <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="user" />
        </label>

        <label className={styles.fieldPassword}>
          <PasswordInput
            id="db-password"
            label="Пароль"
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            autoComplete="new-password"
          />
        </label>
      </div>

      {datasourceId ? <p className={styles.muted}>DataSource ID: {datasourceId}</p> : null}

      {result ? (
        <div className={styles.result}>
          <p className={styles.muted}>
            Создан источник: {result.name} ({result.id})
          </p>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button
          type="button"
          color="white"
          onClick={loadDatasource}
          disabled={!datasourceId || isSubmitting}
        >
          Обновить
        </Button>
        <Button type="button" onClick={handleConnect} disabled={isSubmitting}>
          {isSubmitting ? 'Подключение...' : 'Подключить / создать'}
        </Button>
      </div>
    </div>
  );
}
