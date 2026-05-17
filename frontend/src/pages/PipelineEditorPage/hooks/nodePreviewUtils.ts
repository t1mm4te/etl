import type { NodeConfig } from '../../../api/types';

type BuildNextNodeConfigOptions = {
  selectedSheetName?: string;
  excelSheetNames?: string[];
};

export function buildNextNodeConfig(
  config: NodeConfig,
  uploadedDatasourceId: string,
  options: BuildNextNodeConfigOptions = {}
) {
  if (!uploadedDatasourceId) {
    return config;
  }

  const nextConfig: NodeConfig = {
    ...config,
    datasource_id: uploadedDatasourceId,
  };

  if (options.selectedSheetName) {
    nextConfig.selected_sheet_name = options.selectedSheetName;
  }

  if (options.excelSheetNames && options.excelSheetNames.length > 0) {
    nextConfig.excel_sheet_names = options.excelSheetNames;
  }

  return nextConfig;
}
