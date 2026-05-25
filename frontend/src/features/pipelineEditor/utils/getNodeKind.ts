import type { NodeKind } from '../types/nodeConfigModalTypes';

export function getNodeKind(operationType: string) {
  if (operationType === 'source_file' || operationType === 'source_db') {
    return 'source' as NodeKind;
  }
  if (operationType === 'export_file') {
    return 'sink' as NodeKind;
  }
  return 'transform' as NodeKind;
}
