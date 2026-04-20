import type { NodeConfig } from '../../../api/types';

export function buildNextNodeConfig(config: NodeConfig, uploadedDatasourceId: string) {
  return uploadedDatasourceId ? { ...config, datasource_id: uploadedDatasourceId } : config;
}
