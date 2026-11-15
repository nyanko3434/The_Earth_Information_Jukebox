import type { Sonifier } from '../types.ts';

export function createPlaceholderSonifier(): Sonifier {
  return {
    start() {},
    update() {},
    pause() {},
    dispose() {},
    legend: [],
  };
}
