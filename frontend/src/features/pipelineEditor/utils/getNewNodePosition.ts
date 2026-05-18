import type { ReactFlowInstance } from 'reactflow';

export function calculateNewNodePosition(
  flowInstance: ReactFlowInstance | null,
  canvasElement?: HTMLElement | null
): { x: number; y: number } {
  const defaultPosition = { x: 120, y: 120 };

  if (!flowInstance) {
    return defaultPosition;
  }

  const element = canvasElement ?? document.querySelector('[style*="position"][style*="absolute"]');
  if (!element) {
    return defaultPosition;
  }

  const bounds = element.getBoundingClientRect();
  return flowInstance.screenToFlowPosition({
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  });
}
