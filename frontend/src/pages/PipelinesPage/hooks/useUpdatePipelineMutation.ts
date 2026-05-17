import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchPipeline } from '../../../api/pipelines';
import { pipelinesListKey } from '../../../api/queryKeys';
import type { EditPipelineValues } from './types';

type UpdatePipelineVariables = EditPipelineValues & {
  pipelineId: string;
};

export function useUpdatePipelineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, name, description }: UpdatePipelineVariables) =>
      patchPipeline(pipelineId, { name, description }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelinesListKey });
    },
  });
}
