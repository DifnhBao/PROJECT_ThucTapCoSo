type Listener = (epoch: number) => void;
const listeners = new Set<Listener>();
export function subscribeRecentActivity(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyRecentActivity(epoch: number) {
  for (const listener of listeners) listener(epoch);
}
