# Research archive — outside portfolio-v1 serving

Python evaluation status: **INCOMPLETE**; see [EVALUATION_STATUS.md](EVALUATION_STATUS.md).
Use the Node v1 evaluator for current website evidence.

`python-recommendation/` contains the former versioned `AI_Services/` sources,
notebooks, datasets and model artifacts. Node recommendation in `Server` remains
the web application's serving engine. No Next.js/Express/Compose path calls this
Python code. Moving files does not validate the models, metrics or data provenance.

Original author directories (`Bảo`, `Thạch`), code, notebooks and the original
README were preserved byte-for-byte; see
`docs/verification/evidence/T13/research-move.json` for checksums and old/new paths.
Keep their attribution. Consult the original research README only as historical
instructions, not as the current website deployment guide. Python entrypoints,
evaluation and training claims still require a separate review before use.

Only versioned/non-ignored files were moved. Ignored local `.env`, virtual
environments and caches remain under `AI_Services/`; no secret files were read.
They are not a portable runtime. Recreate a research environment explicitly,
configure paths and credentials locally, and verify dataset rights/provenance
before running or redistributing experiments. Do not load unknown pickle/model
artifacts merely to inspect this archive. T13 did not train models or execute notebooks.
