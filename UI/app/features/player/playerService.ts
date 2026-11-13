import { Track } from "@/app/types/music";

export class PlayerService {
  private originalPlaylist: Track[] = [];
  private shuffledPlaylist: Track[] = [];
  private currentIndex: number = 0;
  private isShuffle: boolean = false;

  setPlaylist(list: Track[], startIndex: number) {
    const safeIndex = Number.isInteger(startIndex) ? Math.max(0, Math.min(startIndex, list.length - 1)) : 0;
    const selected = list[safeIndex]?.trackId;
    const ids = new Set<number>();
    this.originalPlaylist = list.filter((track) => {
      if (!track || !Number.isSafeInteger(track.trackId) || track.trackId <= 0 || ids.has(track.trackId)) return false;
      ids.add(track.trackId); return true;
    });
    startIndex = Math.max(0, this.originalPlaylist.findIndex((track) => track.trackId === selected));
    list = this.originalPlaylist;

    if (this.isShuffle) {
      const currentTrack = list[startIndex];
      let remainingTracks = [...list];

      if (currentTrack) {
        remainingTracks = remainingTracks.filter(t => t.trackId !== currentTrack.trackId);
      }
      this.shuffledPlaylist = this.shuffleArray(remainingTracks);

      if (currentTrack) {
        this.shuffledPlaylist.unshift(currentTrack);
      }
      this.currentIndex = 0;
    } else {
      this.shuffledPlaylist = [];
      this.currentIndex = startIndex;
    }
  }

  setShuffle(shuffle: boolean) {
    if (this.isShuffle === shuffle) return;
    const currentTrack = this.getCurrentTrack();
    this.isShuffle = shuffle;
    if (!this.originalPlaylist.length) return;

    if (shuffle) {
      let remainingTracks = [...this.originalPlaylist];
      if (currentTrack) {
        remainingTracks = remainingTracks.filter(t => t.trackId !== currentTrack.trackId);
      }
      this.shuffledPlaylist = this.shuffleArray(remainingTracks);

      if (currentTrack) {
        this.shuffledPlaylist.unshift(currentTrack);
      }
      this.currentIndex = 0;
    } else {
      if (currentTrack) {
        const index = this.originalPlaylist.findIndex(t => t.trackId === currentTrack.trackId);
        this.currentIndex = index >= 0 ? index : 0;
      }
      this.shuffledPlaylist = [];
    }
  }

  private shuffleArray(array: Track[]): Track[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private get activePlaylist() {
    return this.isShuffle ? this.shuffledPlaylist : this.originalPlaylist;
  }

  getCurrentTrack(): Track | null {
    return this.activePlaylist[this.currentIndex] || null;
  }

  next(wrap = false): Track | null {
    if (!this.activePlaylist.length) return null;

    if (this.currentIndex < this.activePlaylist.length - 1) {
      this.currentIndex++;
      return this.getCurrentTrack();
    }
    if (wrap) { this.currentIndex = 0; return this.getCurrentTrack(); }
    return null;
  }

  prev(wrap = false): Track | null {
    if (!this.activePlaylist.length) return null;
    if (this.currentIndex === 0 && !wrap) return null;
    this.currentIndex = (this.currentIndex - 1 + this.activePlaylist.length) % this.activePlaylist.length;
    return this.getCurrentTrack();
  }

  getIndex() {
    return this.currentIndex;
  }

  getOriginalIndex() {
    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return 0;
    const index = this.originalPlaylist.findIndex(t => t.trackId === currentTrack.trackId);
    return index >= 0 ? index : 0;
  }

  getPlaylist() {
    return [...this.originalPlaylist];
  }

  appendTracks(tracks: Track[]) {
    const existingIds = new Set(this.originalPlaylist.map((t) => t.trackId));
    const unique = tracks.filter((t) => {
      if (!t || !Number.isSafeInteger(t.trackId) || t.trackId <= 0 || existingIds.has(t.trackId)) return false;
      existingIds.add(t.trackId); return true;
    });

    this.originalPlaylist = [...this.originalPlaylist, ...unique];

    if (this.isShuffle) {
      const shuffledNew = this.shuffleArray([...unique]);
      this.shuffledPlaylist = [...this.shuffledPlaylist, ...shuffledNew];
    }
  }

  remaining() {
    return Math.max(0, this.activePlaylist.length - this.currentIndex - 1);
  }
}
