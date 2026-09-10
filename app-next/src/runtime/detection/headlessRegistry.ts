import type { RegionTransition } from '../../engine/signals/location/LocationProvider';
type Handler = (transition: RegionTransition) => Promise<void>;
let handler: Handler | null = null;
let handlerGeneration = 0;
type Bootstrap = () => Promise<void>;
let bootstrap: Bootstrap | null = null;
let bootstrapGeneration = 0;
let initialization: { generation: number; promise: Promise<void> } | null = null;

export function registerHeadlessDetectionHandler(next: Handler): () => void {
  const generation = ++handlerGeneration;
  handler = next;
  return () => {
    if (handlerGeneration === generation) handler = null;
  };
}

/** Registers the cold-launch initializer. It must install a handler before resolving. */
export function registerHeadlessDetectionBootstrap(next: Bootstrap): () => void {
  const generation = ++bootstrapGeneration;
  bootstrap = next;
  return () => {
    if (bootstrapGeneration === generation) {
      bootstrap = null;
      // Do not cancel an initializer already executing; invalidate only reuse.
      if (initialization?.generation === generation) initialization = null;
    }
  };
}

async function ensureHandler(): Promise<Handler> {
  if (handler) return handler;
  const initializer = bootstrap;
  const generation = bootstrapGeneration;
  if (!initializer) throw new Error('Headless detection bootstrap is unavailable');
  if (!initialization || initialization.generation !== generation) {
    const promise = Promise.resolve().then(initializer);
    initialization = { generation, promise };
    void promise.catch(() => {
      if (initialization?.promise === promise) initialization = null;
    });
  }
  const pending = initialization;
  try {
    await pending.promise;
  } catch (error) {
    if (initialization === pending) initialization = null;
    throw error;
  }
  if (!handler) {
    if (initialization === pending) initialization = null;
    throw new Error('Headless detection bootstrap completed without registering a handler');
  }
  return handler;
}

export async function reconcilePersistedGeofenceEvent(transition: RegionTransition): Promise<void> {
  const current = await ensureHandler();
  await current(transition);
}
