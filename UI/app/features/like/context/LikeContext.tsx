"use client";
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { getAuth,type AuthSnapshot } from '../../../lib/auth-state';
import { useAuthState } from '../../../lib/use-auth-state';
import type { Track } from '../../../types/music';
import { mapSongToTrack } from '../../../utils/song.mapper';
import { getMyFavoriteSongs,type FavoritePage } from '../favorite.api';
import { getLikeStatus,toggleLikeSong } from '../like.api';
type LikeContextType = {
  likedMap: Record<number, boolean>; likedSongsList: Track[]; loading: boolean; loadingMore: boolean; hasMore: boolean; listError: string | null;
  fetchLikeStatus: (id: number) => Promise<void>; toggleLike: (id: number) => Promise<void>; fetchLikedSongsList: () => Promise<void>; loadMore: () => Promise<void>;
};
const LikeContext = createContext<LikeContextType | null>(null);
export function LikeProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState('user');
  return <ScopedLikes key={auth.epoch} auth={auth}>{children}</ScopedLikes>;
}
function ScopedLikes({ auth, children }: { auth: AuthSnapshot; children: React.ReactNode }) {
  const userId = auth.principal?.userId, epoch = auth.epoch;
  const active = useCallback(() => getAuth('user').epoch === epoch && getAuth('user').principal?.userId === userId, [epoch, userId]);
  const { data: pages, size, setSize, error, isLoading, isValidating, mutate: mutatePages } = useSWRInfinite<FavoritePage>(
    (index, previous: FavoritePage | null) => !userId || (previous && (!previous.data.length || index >= previous.pagination.totalPages)) ? null : ['user', userId, epoch, 'favorites', index + 1],
    async (key: readonly [string, number, number, string, number]) => getMyFavoriteSongs(key[4], 20),
    { revalidateFirstPage: false, shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const { data: statuses = {}, mutate: mutateStatuses } = useSWR<Record<number, boolean>>(userId ? ['user', userId, epoch, 'like-statuses'] : null, null, { fallbackData: {} });
  const statusRef = useRef<Record<number, boolean>>({});
  const pagesRef = useRef<FavoritePage[]>([]);
  const [flights] = useState(() => new Map<number, Promise<boolean>>());
  const [mutations] = useState(() => new Map<number, Promise<void>>());
  const [versions] = useState(() => new Map<number, number>());
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { statusRef.current = statuses; }, [statuses]);
  useEffect(() => { pagesRef.current = pages ?? []; }, [pages]);
  const setStatus = useCallback((id: number, liked: boolean) => {
    if (!active()) return;
    statusRef.current = { ...statusRef.current, [id]: liked };
    void mutateStatuses(statusRef.current, { revalidate: false });
  }, [active, mutateStatuses]);
  const readStatus = useCallback((id: number): Promise<boolean> => {
    if (!userId || !active()) return Promise.resolve(false);
    if (statusRef.current[id] !== undefined) return Promise.resolve(statusRef.current[id]);
    if (pagesRef.current.some((page) => page.data.some((row) => row.song.song_id === id))) return Promise.resolve(true);
    if (flights.has(id)) return flights.get(id)!;
    const version = versions.get(id) ?? 0;
    const task = getLikeStatus(id).then((result: { liked: boolean }) => {
      if (active() && (versions.get(id) ?? 0) === version) setStatus(id, result.liked);
      return result.liked;
    }).finally(() => { if (flights.get(id) === task) flights.delete(id); });
    flights.set(id, task); return task;
  }, [userId, active, flights, versions, setStatus]);
  const fetchLikeStatus = useCallback(async (id: number) => {
    try { await readStatus(id); } catch { if (active()) setToast('Không tải được trạng thái yêu thích. Vui lòng thử lại.'); }
  }, [readStatus, active]);
  const toggleLike = useCallback((id: number): Promise<void> => {
    if (!userId || !active()) return Promise.resolve();
    if (mutations.has(id)) return mutations.get(id)!;
    let previous: boolean | undefined, version = 0;
    const task: Promise<void> = (async () => {
      try {
        previous = await readStatus(id); if (!active()) return;
        version = (versions.get(id) ?? 0) + 1; versions.set(id, version); setStatus(id, !previous);
        const response: { liked: boolean } = await toggleLikeSong(id);
        if (!active() || versions.get(id) !== version) return;
        setStatus(id, response.liked); setToast(null);
        try { await mutatePages(); } catch { if (active()) setToast('Đã cập nhật yêu thích nhưng chưa tải lại được thư viện.'); }
      } catch (error) {
        if (!active()) return;
        if (previous !== undefined && versions.get(id) === version) setStatus(id, previous);
        setToast('Không cập nhật được yêu thích. Vui lòng tải lại để kiểm tra và thử lại.');
        // A lost POST response is ambiguous. Reconcile with a safe read; never
        // replay the non-idempotent toggle. Keep rollback if the read also fails.
        if (previous !== undefined && versions.get(id) === version) {
          try {
            const confirmed: { liked: boolean } = await getLikeStatus(id);
            if (active() && versions.get(id) === version) { setStatus(id, confirmed.liked); await mutatePages(); }
          } catch { /* The visible error retains the last confirmed state. */ }
        }
        throw error;
      }
    })().finally(() => { if (mutations.get(id) === task) mutations.delete(id); });
    mutations.set(id, task); return task;
  }, [userId, active, mutations, readStatus, versions, setStatus, mutatePages]);
  const likedMap = useMemo(() => ({ ...Object.fromEntries((pages ?? []).flatMap((page) => page.data.map((row) => [row.song.song_id, true]))), ...statuses }), [pages, statuses]);
  const likedSongsList = useMemo(() => Array.from(new Map((pages ?? []).flatMap((page) => page.data).filter((row) => statuses[row.song.song_id] !== false).map((row) => [row.song.song_id, mapSongToTrack(row.song)])).values()), [pages, statuses]);
  const last = pages?.at(-1), hasMore = Boolean(last?.data.length && pages && pages.length < last.pagination.totalPages);
  const loadMore = useCallback(async () => { if (hasMore && !isValidating) await setSize(size + 1); }, [hasMore, isValidating, setSize, size]);
  const fetchLikedSongsList = useCallback(async () => { if (userId) await mutatePages(); }, [userId, mutatePages]);
  return <LikeContext.Provider value={{ likedMap, likedSongsList, fetchLikeStatus, toggleLike, fetchLikedSongsList, loadMore, hasMore, loading: isLoading, loadingMore: isValidating, listError: error ? 'Không tải được thư viện. Vui lòng thử lại.' : null }}>
    {children}
    {toast && <div role="alert" style={{ position: 'fixed', bottom: 220, right: 16, maxWidth: 'min(360px, 90vw)', padding: 12, background: '#7a221c', color: '#fff', borderRadius: 8, zIndex: 2000 }}>{toast} <button onClick={() => setToast(null)} aria-label="Đóng thông báo yêu thích">Đóng</button></div>}
  </LikeContext.Provider>;
}
export function useLikeContext() { const context = useContext(LikeContext); if (!context) throw new Error('useLikeContext phải được dùng trong LikeProvider'); return context; }
