/** Cancel removes handlers and invalidates even callbacks already queued by the browser. */
export function readAudioMetadata(file: File, onReady: (seconds: number) => void, onError: () => void): () => void {
  const audio = new Audio();
  const url = URL.createObjectURL(file);
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    audio.removeEventListener('loadedmetadata', loaded);
    audio.removeEventListener('error', failed);
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(url);
  };
  const failed = () => { if (active) { cleanup(); onError(); } };
  const loaded = () => {
    if (!active) return;
    const seconds = Math.round(audio.duration);
    if (!Number.isFinite(seconds) || seconds <= 0) { failed(); return; }
    cleanup();
    onReady(seconds);
  };
  audio.preload = 'metadata';
  audio.addEventListener('loadedmetadata', loaded);
  audio.addEventListener('error', failed);
  audio.src = url;
  return cleanup;
}
