import { assertAuth,getAuth } from './auth-state';
const pending = new Map<string, string>();
export async function uploadKey(form: FormData, kind: string): Promise<{ key: string; done: () => void }> {
  const scope = kind.startsWith('admin') ? 'admin' : 'user';
  const auth = getAuth(scope);
  const fields: [string, string][] = [];
  for (const [name, value] of form.entries()) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(await value.arrayBuffer());
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((v) => v.toString(16).padStart(2, '0')).join('');
    fields.push([name, hash]);
  }
  fields.sort(([a], [b]) => a.localeCompare(b));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([scope, auth.principal?.userId ?? null, kind, fields]))))).map((v) => v.toString(16).padStart(2, '0')).join('');
  assertAuth(scope, auth.epoch);
  const slot = `upload-pending:${digest}`;
  let key = pending.get(slot);
  try { key ||= sessionStorage.getItem(slot) || undefined; } catch { /* Storage may be disabled. */ }
  key ||= crypto.randomUUID();
  if (pending.size >= 64) pending.delete(pending.keys().next().value!);
  pending.set(slot, key);
  try { sessionStorage.setItem(slot, key); } catch { /* In-memory retry still works. */ }
  return { key, done: () => { pending.delete(slot); try { sessionStorage.removeItem(slot); } catch { /* No storage. */ } } };
}
