import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RunResultsModalMockProps = {
  isOpen: boolean;
  run: { id: string } | null;
  isLoading: boolean;
  onClose: () => void;
};

const editorToolbarMocks = vi.hoisted(() => ({
  pipelineName: 'Пайплайн продаж',
  runData: {
    id: 'run-1',
    status: 'success',
  } as { id: string; status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' } | null,
  isPending: false,
  navigate: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('../../hooks/usePipelineEditorQueries', () => ({
  usePipelineEditorQueries: () => ({
    pipelineQuery: {
      data: editorToolbarMocks.pipelineName ? { name: editorToolbarMocks.pipelineName } : undefined,
    },
    runQuery: { data: editorToolbarMocks.runData },
  }),
}));

vi.mock('../../hooks/usePipelineEditorMutations', () => ({
  usePipelineEditorMutations: () => ({
    runPipelineMutation: {
      isPending: editorToolbarMocks.isPending,
      mutateAsync: editorToolbarMocks.mutateAsync,
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => editorToolbarMocks.navigate,
  };
});

vi.mock('../RunResultsModal', () => ({
  RunResultsModal: ({ isOpen, run, isLoading, onClose }: RunResultsModalMockProps) =>
    isOpen ? (
      <div data-testid="run-results-modal" data-loading={String(isLoading)}>
        <span>{run?.id ?? 'empty'}</span>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

import { EditorToolbar } from './index';

describe('EditorToolbar', () => {
  beforeEach(() => {
    editorToolbarMocks.pipelineName = 'Пайплайн продаж';
    editorToolbarMocks.runData = {
      id: 'run-1',
      status: 'success',
    };
    editorToolbarMocks.isPending = false;
    editorToolbarMocks.navigate.mockReset();
    editorToolbarMocks.mutateAsync.mockReset();
  });

  it('runs the pipeline and opens the results modal', async () => {
    const user = userEvent.setup();
    editorToolbarMocks.mutateAsync.mockResolvedValue({ id: 'run-1' });

    render(<EditorToolbar pipelineId="pipeline-1" />);

    await user.click(screen.getByRole('button', { name: 'Запустить пайплайн' }));

    await waitFor(() => {
      expect(screen.getByTestId('run-results-modal')).toHaveAttribute('data-loading', 'false');
    });

    expect(editorToolbarMocks.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('run-results-modal')).toHaveTextContent('run-1');

    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('run-results-modal')).not.toBeInTheDocument();
  });

  it('shows the pending state while a run is in progress', () => {
    editorToolbarMocks.isPending = true;

    render(<EditorToolbar pipelineId="pipeline-1" />);

    const runButton = screen.getByRole('button', { name: 'Запускаем...' });
    expect(runButton).toBeDisabled();
  });
});
