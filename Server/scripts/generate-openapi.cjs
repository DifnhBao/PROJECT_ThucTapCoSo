const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const { contracts, empty } = require('../src/validation/contracts');
const root = path.resolve(__dirname, '../..');
const mounts = { media: ["media.routes.js", "media"], auth: ['auth.routes.js', 'auth'], users: ['user.routes.js', 'users'], songs: ['song.routes.js', 'songs'], artists: ['artist.routes.js', 'artists'], playlists: ['playlist.routes.js', 'playlists'], ratings: ['rating.routes.js', 'ratings'], favorites: ['favorite.route.js', 'favorites'], activity: ['userActivity.routes.js', 'activity'], recommendations: ['recommendation.routes.js', 'recommendations'] };
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const closed = (properties) => ({ ...object(properties), additionalProperties: false });
const list = (items) => ({ type: 'array', items });
const integer = { type: 'integer' }, string = { type: 'string' };
const song = object({ song_id: integer, title: string, audio_url: { type: 'string', format: 'uri-reference' }, duration: integer, image_url: { type: ['string', 'null'] } }, ['song_id', 'title', 'audio_url']);
const businessDtos = {
  Song: song,
  SongList: object({ songs: list(ref('Song')), total: integer, page: integer, limit: integer }),
  SongDetail: object({ data: ref('Song') }),
  Playlist: object({ playlist_id: integer, name: string, user_id: integer, is_public: { type: 'boolean' }, songs: list(ref('Song')) }, ['playlist_id', 'name']),
  PlaylistDetail: object({ data: ref('Playlist') }),
  PlaylistList: object({ data: list(ref('Playlist')) }),
  User: object({ user_id: integer, username: string, role: { type: 'string', enum: ['user', 'admin', 'super_admin'] } }, ['user_id', 'username']),
  UserDetail: object({ data: ref('User') }),
  SessionTokens: object({ accessToken: string, refreshToken: { type: 'string', minLength: 43, maxLength: 43 }, accessExpiresIn: integer, refreshExpiresAt: { type: 'string', format: 'date-time' } }),
  SessionRefresh: object({ accessToken: string }),
  Login: object({ data: object({ user: ref('User'), tokens: ref('SessionTokens') }) }),
  Registration: object({ data: object({ user: ref('User') }) }),
  AdminLogin: object({ admin: ref('User') }),
  Like: object({ liked: { type: 'boolean' }, song_id: integer }),
  Favorites: object({ data: list(object({ song: ref('Song') }, ['song'])), pagination: object({ total: integer, page: integer, limit: integer, totalPages: integer }) }),
  RatingSummary: object({ song_id: integer, averageRating: { type: 'number' }, totalRatings: integer }),
  Rating: object({ rating: { type: ['number', 'null'] } }),
  Recommendations: object({ data: list(object({ song: ref('Song'), reason: string }, ['song'])), count: integer }, ['data']),
  ListeningReceipt: object({ event_id: { type: 'string', format: 'uuid' }, activity_id: string, qualified: { type: 'boolean' }, song_duration: { type: 'number' }, duplicate: { type: 'boolean' } }),
};
const dto = { requestRefreshToken: 'SessionRefresh', refreshAdminToken: 'SessionRefresh', getSongList: 'SongList', getSongById: 'SongDetail', getSongPreview: 'SongDetail', getPlaylistDetail: 'PlaylistDetail', getMyPlaylists: 'PlaylistList', getUserProfile: 'UserDetail', getUserProfileByAdmin: 'UserDetail', login: 'Login', loginAdmin: 'AdminLogin', register: 'Registration', toggleLikeSong: 'Like', getLikeStatus: 'Like', getMyFavoriteSongs: 'Favorites', getSongRatingSummary: 'RatingSummary', getMyRating: 'Rating', getSimilarSongs: 'Recommendations', getRecommendationsForUser: 'Recommendations', logActivity: 'ListeningReceipt' };
function jsonSchema(schema) {
  const result = z.toJSONSchema(schema, { io: 'output', unrepresentable: 'any' });
  delete result.$schema;
  return result;
}
function buildOpenApi() {
  const doc = { openapi: '3.1.0', info: { title: 'TuneTrek API', version: '1.0.0', description: 'T05 transport contract. data contains the existing business DTO, including any resource-specific data field. Browser clients remove exactly one transport layer. T11 finalized listening events are acknowledged only after database commit.' }, servers: [{ url: '/api' }], paths: {}, components: { securitySchemes: { userCookie: { type: 'apiKey', in: 'cookie', name: 'accessToken' }, adminCookie: { type: 'apiKey', in: 'cookie', name: 'accessToken_admin' }, bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: { ...businessDtos, Error: closed({ error: closed({ code: string, message: string, details: list(closed({ path: string, code: string })) }), requestId: { type: 'string', format: 'uuid' } }) } } };
  for (const [mount, [file, group]] of Object.entries(mounts)) {
    const source = fs.readFileSync(path.join(root, 'Server/src/routes', file), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const matches = source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]\s*,([\s\S]*?)\);/g);
    for (const [, method, route, stack] of matches) {
      const handler = [...stack.matchAll(/\b\w+\.(\w+)\b/g)].at(-1)?.[1];
      if (!handler || !Object.hasOwn(contracts[group], handler)) throw new Error(`Undocumented route: ${group}.${handler}`);
      const contract = contracts[group]?.[handler] || {};
      const url = ('/' + mount + (route === '/' ? '' : route)).replace(/:(\w+)/g, '{$1}');
      const parameters = [...route.matchAll(/:(\w+)/g)].map((match) => ({ name: match[1], in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 2147483647 } }));
      const query = jsonSchema(contract.query || empty);
      for (const [name, schema] of Object.entries(query.properties || {})) parameters.push({ name, in: 'query', required: query.required?.includes(name) && schema.default === undefined || false, schema });
      const admin = /\bprotectAdmin\b/.test(stack), user = /\bprotect\b/.test(stack);
      const created = ['register', 'createSong', 'userUploadSong', 'createPlaylist', 'addNewAdmin', 'logActivity'].includes(handler);
      const operation = { operationId: `${group}_${handler}`, tags: [group], parameters, security: admin ? [{ adminCookie: [] }, { bearerAuth: [] }] : user ? [{ userCookie: [] }, { bearerAuth: [] }] : [], responses: { [created ? '201' : '200']: { description: 'Success', content: { 'application/json': { schema: closed({ data: dto[handler] ? ref(dto[handler]) : { type: 'object', additionalProperties: true }, meta: closed({ requestId: { type: 'string', format: 'uuid' } }) }) } } } } };
      for (const [status, description] of Object.entries({ 400: 'Malformed JSON or invalid request schema', 401: 'Missing/invalid credentials or expired session', 403: 'Forbidden by scope/role/policy', 404: 'Resource absent or not visible', 409: 'Duplicate, reference conflict or invalid resource state', 413: 'Request/upload too large', 415: 'Unsupported media type', 422: 'Valid request shape but invalid resource/domain data', 429: 'Quota exceeded; wait Retry-After seconds', 500: 'Unexpected server error; no internal details' })) operation.responses[status] = { description, content: { 'application/json': { schema: ref('Error') } } };
      operation.responses[429].headers = { 'Retry-After': { description: 'Seconds to wait before a new attempt', schema: { type: 'integer', minimum: 1 } } };
      if (handler === 'rebuildSimilarity') {
        delete operation.responses[200];
        operation.responses[409].description = 'OFFLINE_REBUILD_REQUIRED: use the offline maintenance CLI';
      }
      if (!['get', 'head', 'options'].includes(method)) operation.parameters.push({ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' }, description: 'Exact allowed frontend origin; missing/null/cross-site mutations are rejected' });
      if (contract.body) operation.requestBody = { required: true, content: { [/(createSong|userUploadSong)/.test(handler) ? 'multipart/form-data' : 'application/json']: { schema: jsonSchema(contract.body) } } };
      if (/(createSong|userUploadSong)/.test(handler)) {
        const body = operation.requestBody.content['multipart/form-data'].schema;
        body.properties.audioFile = { type: 'string', format: 'binary' };
        body.properties.imageFile = { type: 'string', format: 'binary' };
        body.required = [...new Set([...(body.required || []), 'audioFile'])];
      }
      if (handler === 'uploadAvatar') operation.requestBody = { required: true, content: { 'multipart/form-data': { schema: { ...object({ avatar: { type: 'string', format: 'binary' } }), additionalProperties: false } } } };
      if (/optionalAuth/.test(stack)) operation.security = [{}, { userCookie: [] }, { adminCookie: [] }, { bearerAuth: [] }];
      if (handler === 'logActivity') { operation.responses[200] = { ...operation.responses[201], description: 'Identical committed event replay; no additional count' }; operation.description = 'Finalized event v1; user from auth. UUID scoped by user; same UUID and different payload returns409 ACTIVITY_CONFLICT. Activity and qualified view increment commit atomically. Short (<20s) or unknown-duration songs do not qualify.'; }
      if (handler === 'increaseView') { operation.deprecated = true; delete operation.responses[200]; operation.responses[410] = { description: 'VIEW_ENDPOINT_RETIRED; submit a finalized listening event', content: { 'application/json': { schema: ref('Error') } } }; }
      if (handler === 'addSongToPlaylist') operation.description = 'Owner-only transactional append. Concurrent additions serialize on the parent playlist. Existing song returns409 PLAYLIST_SONG_EXISTS; no position change. Lock contention after bounded retry returns409 PLAYLIST_BUSY.';
      if (handler === 'deletePlaylist') operation.description = 'Owner-only atomic parent and membership deletion. Any failure rolls back both.';
      if (handler === 'removeSongFromPlaylist') operation.description = 'Owner-only serialized removal; absent membership returns200. An existing hidden song may be removed.';
      if (/^(createSong|userUploadSong)$/.test(handler)) operation.responses[200] = { ...operation.responses[201], description: 'Completed idempotent replay; no new resource' };
      if (/^(createSong|userUploadSong|uploadAvatar)$/.test(handler)) operation.responses[503] = { description: 'Commit outcome unknown; retry the same Idempotency-Key', content: { 'application/json': { schema: ref('Error') } } };
      if (/^(createSong|userUploadSong|uploadAvatar)$/.test(handler)) operation.parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9_-]+$' } });
      if (handler === 'readMedia') {
        operation.security = [{}, { adminCookie: [] }, { bearerAuth: [] }];
        operation.parameters = [{ name: 'assetId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'Range', in: 'header', schema: { type: 'string', pattern: '^bytes=[0-9]+-[0-9]*$' } }];
        for (const status of [200, 206]) operation.responses[status] = { description: 'Authorized binary media stream, private/no-store', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } };
      }
      doc.paths[url] ||= {};
      doc.paths[url][method] = operation;
    }
  }
  return doc;
}
if (require.main === module) {
  const output = path.join(root, 'docs/api/openapi.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(buildOpenApi(), null, 2) + '\n');
  console.log('Generated docs/api/openapi.json');
}
module.exports = { buildOpenApi, mounts };
