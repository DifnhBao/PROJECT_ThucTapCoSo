const fs = require('node:fs');
const path = require('node:path');
const { createDemoWav, demoTrack, TRACK_COUNT } = require('../Server/database/demo-media.cjs');
const directory = path.resolve(__dirname, '../UI/public/demo');
fs.mkdirSync(directory, { recursive: true });
for (let id = 1; id <= TRACK_COUNT; id++) {
  fs.writeFileSync(path.join(directory, path.basename(demoTrack(id).audio_url)), createDemoWav(id));
}
// Keep the existing upload smoke-test fixture URL compatible.
fs.writeFileSync(path.join(directory, 'tone.wav'), createDemoWav(1));
console.log('Generated 28 distinct demo tracks (25–30 seconds) in UI/public/demo.');
