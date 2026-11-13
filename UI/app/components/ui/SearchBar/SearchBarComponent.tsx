'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { searchSongs } from '@/app/features/song/song.api';
import type { Track } from '@/app/types/music';
import styles from './search.module.css';
export default function SearchBarComponent() {
  const [query, setQuery] = useState(''), [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ query: string; tracks: Track[]; error: boolean }>({ query: '', tracks: [], error: false });
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(async () => {
      if (!query.trim()) return;
      try { const tracks = await searchSongs(query.trim(), 10, controller.signal); if (active) setResult({ query, tracks, error: false }); }
      catch { if (active) setResult({ query, tracks: [], error: true }); }
    }, 300);
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [query, attempt]);
  const loading = result.query !== query;
  return <div ref={root} className={`${styles.container} ${styles.inputWrapper}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <input className={styles.input} aria-label="Tìm bài hát" placeholder="Tìm bài hát…" value={query} onFocus={() => setFocused(true)} onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape') setFocused(false); if (e.key === 'ArrowDown') { e.preventDefault(); root.current?.querySelector<HTMLAnchorElement>('a')?.focus(); } }} />
    {query && <button aria-label="Xóa tìm kiếm" onClick={() => { setQuery(''); root.current?.querySelector('input')?.focus(); }}>Xóa</button>}
    {focused && query.trim() && <div className={styles.resultsList} aria-label="Kết quả tìm kiếm" aria-live="polite" onKeyDown={(e) => {
      if (e.key === 'Escape') setFocused(false);
      if (['ArrowDown','ArrowUp'].includes(e.key)) { e.preventDefault(); const links = [...(root.current?.querySelectorAll('a') ?? [])]; const index = links.indexOf(document.activeElement as HTMLAnchorElement); links[(index + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length]?.focus(); }
    }}>
      {loading ? <p role="status">Đang tìm…</p> : result.error ? <p role="alert">Tìm kiếm thất bại. <button onClick={() => { setResult({ query: '', tracks: [], error: false }); setAttempt((n) => n + 1); }}>Thử lại</button></p> : !result.tracks.length ? <p>Không tìm thấy bài hát phù hợp.</p> : result.tracks.map((track) => <Link key={track.trackId} className={styles.resultItem} href={`/songs/${track.trackId}`} onClick={() => setFocused(false)}>{track.title} · {track.artistName}</Link>)}
    </div>}
  </div>;
}
