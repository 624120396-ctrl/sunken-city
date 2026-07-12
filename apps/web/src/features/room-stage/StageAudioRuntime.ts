export class StageAudioRuntime {
  private tracks: HTMLAudioElement[] = [];

  async unlock(urls: string[]) {
    this.stop();
    this.tracks = urls.map((url) => new Audio(url));
    await Promise.all(this.tracks.map((track) => track.play()));
  }

  stop() { this.tracks.forEach((track) => { track.pause(); track.src = ''; }); this.tracks = []; }
}
