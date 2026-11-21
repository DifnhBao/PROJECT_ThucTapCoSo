// Preserve the database timestamp verbatim (including fractional seconds).
function decodeRecentCursor(value) {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const [time, id] = decoded;
    if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(time) || !Number.isFinite(Date.parse(time.replace(' ', 'T') + 'Z'))) return null;
    if (new Date(time.replace(' ', 'T') + 'Z').toISOString().slice(0, 23) !== time.replace(' ', 'T').slice(0, 23)) return null;
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) return null;
    if (encodeRecentCursor(time, id) !== value) return null;
    return { time, id };
  } catch { return null; }
}
const encodeRecentCursor = (time, id) => Buffer.from(JSON.stringify([time, id])).toString('base64url');
module.exports = { decodeRecentCursor, encodeRecentCursor };
