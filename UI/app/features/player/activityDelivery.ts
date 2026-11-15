import { ApiError } from '../../lib/api-contract';
import { apiFetch } from '../../lib/api-transport';
import { getAuth } from '../../lib/auth-state';
import type { ListeningEvent } from './listeningSession';
const URL = '/api/activity';
type Pending = { body: string; beaconTried: boolean; epoch: number };
export class ActivityDelivery {
  private pending = new Set<Pending>();
  constructor(private request: typeof fetch = (input, init) => apiFetch(String(input), init, 'user', !init?.keepalive), private sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))) {}
  async send(event: ListeningEvent): Promise<boolean> {
    if (this.pending.size >= 20) return false; // Bounded RAM; no persistent outbox.
    const item = { body: JSON.stringify(event), beaconTried: false, epoch: getAuth('user').epoch }; this.pending.add(item);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (getAuth('user').epoch !== item.epoch) return false;
        try {
          const response = await this.request(URL, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: item.body, signal: AbortSignal.timeout(5000) });
          if (response.status === 200 || response.status === 201) {
            const json = await response.json();
            if (json.data?.event_id === event.session_id && typeof json.data?.activity_id === 'string') return true;
          }
          if (response.status < 500) return false; // No retry for auth/schema/conflict/quota errors.
        } catch (error) { if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false; /* Network error/timeout retries the same event. */ }
        if (attempt < 2) await this.sleep(attempt === 0 ? 250 : 750);
      }
      return false;
    } finally { this.pending.delete(item); }
  }
  clear() { this.pending.clear(); }
  pagehide(beacon: (url: string, data: Blob) => boolean) {
    for (const item of this.pending) {
      if (item.beaconTried || getAuth('user').epoch !== item.epoch) continue;
      item.beaconTried = true;
      let queued = false;
      try { queued = beacon(URL, new Blob([item.body], { type: 'application/json' })); } catch { /* Best effort only. */ }
      if (!queued) void this.request(URL, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: item.body, keepalive: true, signal: AbortSignal.timeout(5000) }).catch(() => {});
      // queued=true is transport admission, never a database ACK.
    }
  }
}
