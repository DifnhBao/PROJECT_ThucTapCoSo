const SAMPLE_RATE = 8000;
const TRACK_COUNT = 28;
function demoTrack(id) {
  return { duration: 25 + (id - 1) % 6, audio_url: `/demo/track-${String(id).padStart(2, '0')}.wav` };
}
function createDemoWav(id, seconds = demoTrack(id).duration) {
  const samples = Math.round(SAMPLE_RATE * seconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24); buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  const base = 130.81 * 2 ** ((id - 1) / 12);
  const beat = 0.3 + (id % 5) * 0.08;
  const notes = [1, 1.25, 1.5, 2];
  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE;
    const frequency = base * notes[(Math.floor(t / beat) + id) % notes.length];
    const fade = Math.min(1, t / 0.05, (seconds - t) / 0.1);
    const envelope = 0.35 + 0.65 * Math.sin(Math.PI * (t % beat) / beat) ** 2;
    const wave = Math.sin(2 * Math.PI * frequency * t) + 0.3 * Math.sin(2 * Math.PI * base * t);
    buffer.writeInt16LE(Math.round(2400 * fade * envelope * wave), 44 + i * 2);
  }
  return buffer;
}
module.exports = { demoTrack, createDemoWav, TRACK_COUNT };
