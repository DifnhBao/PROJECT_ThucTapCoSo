# Recommendation checks

- `evaluate.cjs`: supported Node v1 offline temporal evaluation. See
  [protocol and results](../docs/evaluation/README.md).
- `benchmark.js`: synthetic genre-consistency smoke test. It never uses engine
  explanations as relevance and does not calculate MAP or serendipity.
  Run with `--input Benchmark/fixtures/genre-smoke.json` from repo root.
  Optional `--api` requires manually supplied demo access tokens via
  `BENCHMARK_TOKEN_USER_1` … `_4`; no credentials are stored. It is not part of the
  offline quality evaluation and does not establish the provenance of API data.
- `generate-fixture.cjs`: deterministic synthetic fixture generator, seed 150015.
- `fixtures/metric-hand-calculated.json`: hand-calculated binary metrics fixture.

The pre-existing `Bieu-Do-Danh-Gia-He-Khuyen-Nghi.png` is a legacy, unverified chart.
It is preserved but is not current quality evidence. No chart provider is called
by the new offline evaluation/smoke commands. Published metrics are JSON/CSV.
