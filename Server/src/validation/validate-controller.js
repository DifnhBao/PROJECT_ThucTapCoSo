const { z } = require('zod');
const { AppError } = require('../utils/app-error');
const { id, empty } = require('./contracts');
const path = require('node:path');
const fs = require('node:fs/promises');

const { cleanup: cleanupRejectedUpload } = require('../services/upload-files');

function withContracts(handlers, contracts) {
  for (const [name, contract] of Object.entries(contracts)) {
    if (typeof handlers[name] !== 'function') throw new Error(`Missing contracted handler ${name}`);
    const handler = handlers[name];
    handlers[name] = async (req, res, next) => {
      const values = {};
      for (const [source, schema] of Object.entries({ params: z.record(z.string(), id), query: contract.query || empty, body: contract.body || empty })) {
        const input = source === 'body' && req.body == null ? {} : req[source];
        const result = schema.safeParse(input === undefined ? {} : input);
        if (!result.success) {
          await cleanupRejectedUpload(req);
          return next(new AppError('Dữ liệu đầu vào không hợp lệ.', 400, 'VALIDATION_ERROR', result.error.issues.map((issue) => ({ path: [source, ...issue.path.filter((key) => typeof key !== 'symbol')].map(String).join('.'), code: issue.code }))));
        }
        values[source] = result.data;
      }
      for (const [source, value] of Object.entries(values)) Object.defineProperty(req, source, { value, configurable: true, writable: true });
      return handler(req, res, next);
    };
  }
  return handlers;
}
module.exports = { withContracts };
