"use client";
import { SWRConfig } from 'swr';
import type { AuthScope } from './auth-state';
import { useAuthState } from './use-auth-state';
export function AccountCacheBoundary({ scope, children }: { scope: AuthScope; children: React.ReactNode }) {
  const snapshot = useAuthState(scope);
  return <SWRConfig key={`${scope}:${snapshot.epoch}`} value={{ provider: () => new Map(), shouldRetryOnError: false, revalidateOnFocus: false }}>{children}</SWRConfig>;
}
