import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../../../../../shared/ui/Input';
import { PasswordInput } from '../../../../../../shared/ui/PasswordInput';
import { CustomSelect, type SelectOption } from '../../../../../../shared/ui/CustomSelect';
import { Button } from '../../../../../../shared/ui/Button';
import { Textarea } from '../../../../../../shared/ui/Textarea';
import styles from './index.module.scss';
import type { SourceDbConfigEditorProps } from '../types';
import { connectDatasourceDb } from '../../../../../../shared/api/pipelines';
import type { DataSourceDBRequest } from '../../../../../../shared/api/types';
import { extractError } from '../../../../../../shared/lib/extractError';

type EngineOption = SelectOption & { defaultPort: number };

const ENGINE_OPTIONS: EngineOption[] = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
];

const DB_OPTION_KEYS = {
  postgresql: ['sslmode', 'channel_binding', 'connect_timeout'] as const,
  mysql: ['ssl_ca', 'ssl_verify_cert', 'connect_timeout'] as const,
};

const sourceDbSchema = z
  .object({
    name: z.string().trim().min(1),
    dbEngine: z.enum(['postgresql', 'mysql']),
    host: z.string().trim().min(1),
    port: z
      .string()
      .trim()
      .min(1)
      .refine((value) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0;
      }),
    dbName: z.string().trim().min(1),
    user: z.string().trim().min(1),
    password: z.string().min(1),
    dbSchema: z.string().optional(),
    dbTable: z.string().trim().min(1),
    dbOptions: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;

        try {
          const parsed = JSON.parse(value) as unknown;
          return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
        } catch {
          return false;
        }
      }),
  })
  .superRefine((values, context) => {
    const rawOptions = values.dbOptions.trim();
    if (!rawOptions) return;

    try {
      const parsed = JSON.parse(rawOptions) as Record<string, unknown>;
      const allowedKeys = DB_OPTION_KEYS[values.dbEngine] as readonly string[];
      const unknownKeys = Object.keys(parsed).filter((key) => !allowedKeys.includes(key));

      if (unknownKeys.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dbOptions'],
          message: `Неподдерживаемые ключи: ${unknownKeys.join(', ')}.`,
        });
      }
    } catch {
      // already handled above
    }
  });

type SourceDbFormValues = z.infer<typeof sourceDbSchema>;

function getDefaultPort(engine?: string) {
  return ENGINE_OPTIONS.find((option) => option.value === engine)?.defaultPort ?? 5432;
}

function getDbOptionsTemplate(engine: string) {
  if (engine === 'mysql') {
    return JSON.stringify(
      {
        ssl_ca: '/path/to/ca.pem',
        ssl_verify_cert: true,
        connect_timeout: 10,
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      sslmode: 'require',
      channel_binding: 'require',
      connect_timeout: 10,
    },
    null,
    2
  );
}

function parseDbOptions(value: string): Record<string, string> | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const parsed = JSON.parse(trimmedValue) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('db_options должен быть JSON-объектом.');
  }

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, item]) => [key, String(item)])
  );
}

export function SourceDbConfigEditor({ onConnected }: SourceDbConfigEditorProps) {
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SourceDbFormValues>({
    resolver: zodResolver(sourceDbSchema),
    mode: 'onTouched',
    defaultValues: {
      name: 'Подключение к базе данных',
      dbEngine: 'postgresql',
      host: '',
      port: String(ENGINE_OPTIONS[0].defaultPort),
      dbName: '',
      user: '',
      password: '',
      dbSchema: '',
      dbTable: '',
      dbOptions: getDbOptionsTemplate('postgresql'),
    },
  });

  const [errorText, setErrorText] = useState<string | null>(null);
  const previousEngineRef = useRef<SourceDbFormValues['dbEngine']>('postgresql');
  const selectedEngine = useWatch({ control, name: 'dbEngine' }) ?? 'postgresql';
  const dbOptionsTemplate = useMemo(() => getDbOptionsTemplate(selectedEngine), [selectedEngine]);
  const selectClassName = `${styles.selectWrapper} ${errors.dbEngine ? styles.selectInvalid : ''}`;

  useEffect(() => {
    const previousEngine = previousEngineRef.current;

    if (previousEngine === selectedEngine) {
      return;
    }

    const currentPort = getValues('port');
    const previousPort = String(getDefaultPort(previousEngine));
    if (!currentPort.trim() || currentPort === previousPort) {
      setValue('port', String(getDefaultPort(selectedEngine)), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    const currentOptions = getValues('dbOptions');
    const previousTemplate = getDbOptionsTemplate(previousEngine);
    if (!currentOptions.trim() || currentOptions === previousTemplate) {
      setValue('dbOptions', getDbOptionsTemplate(selectedEngine), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    previousEngineRef.current = selectedEngine;
  }, [getValues, selectedEngine, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorText(null);

    try {
      const payload: DataSourceDBRequest = {
        name: values.name.trim(),
        db_engine: values.dbEngine,
        db_host: values.host.trim(),
        db_port: Number(values.port),
        db_name: values.dbName.trim(),
        db_user: values.user.trim(),
        db_password: values.password,
        db_schema: values.dbSchema?.trim() || undefined,
        db_table: values.dbTable.trim(),
        db_options: parseDbOptions(values.dbOptions),
      };

      const datasource = await connectDatasourceDb(payload);

      if (onConnected) {
        await onConnected(datasource);
      }
    } catch (err) {
      setErrorText(extractError(err, 'Ошибка подключения'));
    }
  });

  return (
    <div className={styles.root}>
      <label className={styles.label}>
        Название
        <Input
          {...register('name')}
          placeholder="Произвольное имя для узла"
          isInvalid={Boolean(errors.name)}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.label}>
          Движок
          <Controller
            control={control}
            name="dbEngine"
            render={({ field }) => (
              <CustomSelect
                options={ENGINE_OPTIONS}
                value={ENGINE_OPTIONS.find((option) => option.value === field.value) ?? null}
                onChange={(opt) => {
                  const nextOption = Array.isArray(opt) ? opt[0] : opt;
                  field.onChange((nextOption as SelectOption | null)?.value ?? 'postgresql');
                }}
                isClearable={false}
                isSearchable={false}
                className={selectClassName}
              />
            )}
          />
        </label>

        <label className={styles.label}>
          Хост
          <Input {...register('host')} placeholder="localhost" isInvalid={Boolean(errors.host)} />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Порт
          <Input {...register('port')} placeholder="5432" isInvalid={Boolean(errors.port)} />
        </label>

        <label className={styles.label}>
          Имя БД
          <Input {...register('dbName')} placeholder="db_name" isInvalid={Boolean(errors.dbName)} />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Пользователь
          <Input {...register('user')} placeholder="user" isInvalid={Boolean(errors.user)} />
        </label>

        <label className={styles.fieldPassword}>
          <PasswordInput
            id="db-password"
            label="Пароль"
            autoComplete="new-password"
            {...register('password')}
            isInvalid={Boolean(errors.password)}
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Схема
          <Input {...register('dbSchema')} placeholder="public" />
        </label>

        <label className={styles.label}>
          Таблица
          <Input
            {...register('dbTable')}
            placeholder="table_name"
            isInvalid={Boolean(errors.dbTable)}
          />
        </label>
      </div>

      <details className={styles.optionsDisclosure}>
        <summary className={styles.optionsSummary}>
          <span>Дополнительные опции подключения</span>
          <span
            className={styles.questionIcon}
            title="Это JSON-объект с дополнительными параметрами драйвера. Обычно нужны SSL, таймауты и специфичные настройки соединения."
            aria-label="Что такое дополнительные опции подключения"
          >
            ?
          </span>
        </summary>

        <ul className={styles.helpList}>
          {selectedEngine === 'mysql' ? (
            <>
              <li>
                <strong>ssl_ca</strong> — путь к CA-сертификату.
              </li>
              <li>
                <strong>ssl_verify_cert</strong> — проверять сертификат сервера.
              </li>
              <li>
                <strong>connect_timeout</strong> — таймаут подключения в секундах.
              </li>
            </>
          ) : (
            <>
              <li>
                <strong>sslmode</strong> — режим SSL-соединения, например <code>require</code>.
              </li>
              <li>
                <strong>channel_binding</strong> — дополнительная защита аутентификации.
              </li>
              <li>
                <strong>connect_timeout</strong> — таймаут подключения в секундах.
              </li>
            </>
          )}
        </ul>

        <div className={styles.optionList}>
          <Textarea
            {...register('dbOptions')}
            rows={10}
            placeholder={dbOptionsTemplate}
            className={styles.dbOptionsInput}
            isInvalid={Boolean(errors.dbOptions)}
          />
        </div>
      </details>

      {errorText ? <p className={styles.error}>{errorText}</p> : null}

      <div className={styles.actions}>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Подключение...' : 'Подключить'}
        </Button>
      </div>
    </div>
  );
}
