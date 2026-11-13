const fetch = require("./browser-fetch.cjs");
// Existing T01-T04 behavior tests assert business DTOs. Wire-format assertions
// live in api/contract.test.cjs; this helper only removes the T05 transport layer.
async function fetchPayload(...args) {
  const response = await fetch(...args);
  return new Proxy(response, {
    get(target, key) {
      if (key === 'json') return async () => {
        const body = await target.json();
        return target.ok ? body.data : body.error;
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
module.exports = { fetchPayload };
