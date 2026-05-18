import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchPipeline } from '../../../shared/api/pipelines';
import { pipelinesListKey } from '../../../shared/api/queryKeys';
import type { EditPipelineValues } from '../types/types';

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
