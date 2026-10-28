import { ExploreRuntime } from './runtime';
import { loadExploreRuntime } from './seed-repository';

declare global {
  // eslint-disable-next-line no-var
  var __exploreDemoRuntime: ExploreRuntime | undefined;
}

export function demoRuntime(): ExploreRuntime {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo tracking is unavailable in production');
  return globalThis.__exploreDemoRuntime ??= new ExploreRuntime(loadExploreRuntime());
}
