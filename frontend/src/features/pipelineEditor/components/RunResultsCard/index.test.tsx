import type { PipelineRunDetail } from '../../../../shared/api/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunResultsCard } from './index';

const run: PipelineRunDetail = {
  id: 'run-1',
  pipeline: 'pipeline-1',
  status: 'success',
  run_mode: 'full',
  target_node: null,
  created_at: '2026-06-01T10:00:00.000Z',
  started_at: '2026-06-01T10:01:00.000Z',
  finished_at: '2026-06-01T10:02:00.000Z',
  error_message: '',
  celery_task_id: 'task-1',
  node_runs: [
    {
      id: 'node-run-1',
      node: 'node-1',
      node_label: 'Источник',
      node_operation: 'source_file',
      status: 'success',
      output_row_count: 42,
      output_columns_meta: [],
      error_message: '',
      started_at: null,
      finished_at: null,
    },
  ],
};

describe('RunResultsCard', () => {
  it('renders the run summary and node details', () => {
    render(<RunResultsCard run={run} />);

    expect(screen.getByText('Запуск завершён')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Успешно' })).toBeInTheDocument();
    expect(screen.getByText('Источник')).toBeInTheDocument();
    expect(screen.getByText('Строк: 42')).toBeInTheDocument();
    expect(screen.getByText('Узлы пайплана')).toBeInTheDocument();
  });
});