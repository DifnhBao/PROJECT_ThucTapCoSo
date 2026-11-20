const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { evaluate } = require('../Server/src/evaluation/evaluate');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function run(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--out', '--k'].includes(args[i]) || !args[i + 1] || flags[args[i]]) throw new Error('Usage: node Benchmark/evaluate.cjs --input file.json --out directory --k 5');
    flags[args[i]] = args[i + 1];
  }
  if (!flags['--input'] || !flags['--out'] || (flags['--k'] && !/^\d+$/.test(flags['--k']))) throw new Error('Explicit --input/--out and integer --k required');
  const input = path.resolve(flags['--input']), out = path.resolve(flags['--out']);
  if (fs.statSync(input).size > 5 * 1024 * 1024) throw new Error('Input exceeds 5 MiB limit');
  let data;
  try { data = JSON.parse(fs.readFileSync(input, 'utf8')); } catch { throw new Error('Input is not valid JSON'); }
  const report = evaluate(data, Number(flags['--k'] || 5));
  const sourceFiles = ['ranking.js', 'signals.js', 'config.js', 'hybridSimilarity.service.js', 'metadataSimilarity.service.js', 'lyricsSimilarity.service.js', 'behavioralSimilarity.service.js']
    .map((file) => path.resolve(__dirname, '../Server/src/services/recommendation', file))
    .concat(['input.js', 'evaluate.js', 'metrics.js'].map((file) => path.resolve(__dirname, '../Server/src/evaluation', file)));
  const sourceHashes = Object.fromEntries(sourceFiles.map((file) => [path.relative(path.resolve(__dirname, '..'), file).replaceAll('\\', '/'), digest(fs.readFileSync(file))]));
  const manifest = { input: path.relative(path.resolve(__dirname, '..'), input).replaceAll('\\', '/'), data_sha256: digest(fs.readFileSync(input)),
    source_sha256: sourceHashes, source_manifest_sha256: digest(JSON.stringify(sourceHashes)), node: process.version,
    seed: report.seed, config: report.config, tuning: 'none; config fixed before validation/test',
    command: 'node Benchmark/evaluate.cjs --input ' + JSON.stringify(path.relative(process.cwd(), input).replaceAll('\\', '/')) + ' --out <output-directory> --k ' + report.k };
  const { rows, ...metrics } = report;
  const columns = ['split', 'model', 'cohort', 'users', 'evaluated_users', 'excluded_no_relevant', 'relevant_items', 'recall', 'ndcg', 'catalog_coverage', 'recommended_unique'];
  fs.mkdirSync(out, { recursive: true });
  for (const [file, value] of Object.entries({ 'metrics.json': metrics, 'rankings.json': rows, 'manifest.json': manifest })) fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'metrics.csv'), columns.join(',') + '\n' + report.metrics.map((r) => columns.map((c) => r[c] ?? '').join(',')).join('\n') + '\n');
  return { data_label: report.data_label, users: report.counts.users, eligible_catalog: report.counts.eligible_catalog, k: report.k, output: out };
}
if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { run };
