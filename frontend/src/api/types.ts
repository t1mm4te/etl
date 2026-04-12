export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  username: string;
  first_name: string;
  last_name: string;
}

export interface SetPasswordPayload {
  current_password: string;
  new_password: string;
}

export interface SetEmailPayload {
  current_password: string;
  new_email: string;
}

export interface LoginResponse {
  auth_token: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PipelineListItem {
  id: string;
  name: string;
  description: string;
  node_count: number;
  last_run_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineBase {
  id: string;
  name: string;
  description: string;
}

export interface Edge {
  id: string;
  source_node: string;
  target_node: string;
  source_port: string;
  target_port: string;
}

export interface NodeConfig {
  [key: string]: unknown;
}

export interface Node {
  id: string;
  operation_type: string;
  label: string;
  config: NodeConfig;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface PipelineDetail extends PipelineBase {
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

export interface PipelineCreatePayload {
  name: string;
  description?: string;
}

export interface PipelineUpdatePayload {
  name: string;
  description?: string;
}

export interface NodeCreatePayload {
  operation_type: string;
  label: string;
  config?: NodeConfig;
  position_x?: number;
  position_y?: number;
}

export interface NodeUpdatePayload {
  operation_type?: string;
  label?: string;
  config?: NodeConfig;
  position_x?: number;
  position_y?: number;
}

export interface EdgeCreatePayload {
  source_node: string;
  target_node: string;
  source_port?: string;
  target_port?: string;
}

export interface OperationCategory {
  label: string;
  description: string;
  icon: string;
  order: number;
}

export interface OperationItem {
  type: string;
  label: string;
  description: string;
  category: string;
  num_inputs: number;
  input_ports: string[];
  config_schema: {
    type: string;
    required?: string[];
    properties?: Record<string, unknown>;
    additionalProperties?: boolean;
  };
}

export interface OperationCatalogResponse {
  categories: Record<string, OperationCategory>;
  operations: OperationItem[];
}

export interface PipelineRun {
  id: string;
  pipeline: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string;
}

export interface NodeRun {
  id: string;
  node: string;
  node_label: string;
  node_operation: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  output_row_count: number | null;
  output_columns_meta: Array<Record<string, unknown>>;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface PipelineRunDetail extends PipelineRun {
  celery_task_id: string;
  node_runs: NodeRun[];
}

export interface PreviewResponse {
  columns: string[];
  dtypes: Record<string, string>;
  total_rows: number;
  preview_rows: number;
  data: Array<Record<string, unknown>>;
}

export interface DataSourceDetail {
  id: string;
  name: string;
  source_type: string;
  status: string;
  original_filename: string;
  sheet_name: string;
  row_count: number;
  column_count: number;
  columns_meta: Array<Record<string, unknown>>;
  file_size_bytes: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}
