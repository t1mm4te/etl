import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePipeline } from '../../../api/pipelines';
import { pipelinesListKey } from '../../../api/queryKeys';

export function useDeletePipelineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pipelineId: string) => deletePipeline(pipelineId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelinesListKey });
    },
  });
}
