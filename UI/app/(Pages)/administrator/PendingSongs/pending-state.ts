export function pendingViewState({ error, isLoading, hasData, count }: { error: unknown; isLoading: boolean; hasData: boolean; count: number }) {
  if (error) return 'error';
  if (isLoading || !hasData) return 'loading';
  return count === 0 ? 'empty' : 'data';
}
