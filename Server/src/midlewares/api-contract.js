const { randomUUID } = require('node:crypto');

// The data object is the endpoint's business DTO. Transport envelopes are owned here.
function apiContract(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const json = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode === 204) return res.end();
    // Errors already use the global handler's error envelope.
    if (res.statusCode >= 400) return json(data);
    return json({ data: data === undefined ? null : data, meta: { requestId: req.requestId } });
  };
  next();
}
module.exports = { apiContract };
