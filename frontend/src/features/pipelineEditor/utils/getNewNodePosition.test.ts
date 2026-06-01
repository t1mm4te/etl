import type { ReactFlowInstance } from 'reactflow';
import { describe, expect, it, vi } from 'vitest';
import { calculateNewNodePosition } from './getNewNodePosition';

describe('calculateNewNodePosition', () => {
  it('returns a default position when the flow instance is missing', () => {
    expect(calculateNewNodePosition(null)).toEqual({ x: 120, y: 120 });
  });

  it('uses the canvas center when a flow instance and canvas are provided', () => {
    const flowInstance = {
      screenToFlowPosition: vi.fn(({ x, y }) => ({ x: x + 1, y: y + 2 })),
    } as unknown as ReactFlowInstance;

    const canvas = document.createElement('div');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 10,
        top: 20,
        width: 100,
        height: 40,
        right: 110,
        bottom: 60,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }),
    });

    expect(calculateNewNodePosition(flowInstance, canvas)).toEqual({ x: 61, y: 42 });
    expect(flowInstance.screenToFlowPosition).toHaveBeenCalledWith({ x: 60, y: 40 });
  });
});