import { Track } from "@/app/types/music";

export class PlayerService {
  private originalPlaylist: Track[] = [];
  private shuffledPlaylist: Track[] = [];
  private currentIndex: number = 0;
  private isShuffle: boolean = false;

  setPlaylist(list: Track[], startIndex: number) {
    this.originalPlaylist = [...list];
    
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
    this.isShuffle = shuffle;

    if (!this.originalPlaylist.length) return;

    const currentTrack = this.getCurrentTrack();

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

  next(): Track | null {
    if (!this.activePlaylist.length) return null;

    if (this.currentIndex < this.activePlaylist.length - 1) {
      this.currentIndex++;
      return this.getCurrentTrack();
    }
    return null;
  }

  prev(): Track | null {
    if (!this.activePlaylist.length) return null;
    this.currentIndex =
      (this.currentIndex - 1 + this.activePlaylist.length) % this.activePlaylist.length;
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
    return this.originalPlaylist;
  }

  appendTracks(tracks: Track[]) {
    const existingIds = new Set(this.originalPlaylist.map((t) => t.trackId));
    const unique = tracks.filter((t) => !existingIds.has(t.trackId));

    this.originalPlaylist = [...this.originalPlaylist, ...unique];

    if (this.isShuffle) {
      const shuffledNew = this.shuffleArray([...unique]);
      this.shuffledPlaylist = [...this.shuffledPlaylist, ...shuffledNew];
    }
  }

  remaining() {
    return this.activePlaylist.length - this.currentIndex - 1;
  }
}
