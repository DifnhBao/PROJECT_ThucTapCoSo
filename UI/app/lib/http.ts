import axios,{ AxiosError,AxiosHeaders,type AxiosResponse } from 'axios';
import { apiFailure,unwrapApiEnvelope } from './api-contract';
import { apiFetch } from './api-transport';
// Axios is a compatibility facade for existing DTO consumers. It has no separate
// refresh queue or network retry; its adapter delegates to the common transport.
const http = axios.create({ baseURL: '/api', withCredentials: true, adapter: async (config) => {
  const url = axios.getUri(config), headers = new Headers();
  for (const [key, value] of Object.entries(config.headers.toJSON())) if (value !== undefined && value !== null) headers.set(key, String(value));
  if (config.data instanceof FormData) headers.delete('Content-Type'); // Browser supplies the multipart boundary.
  const response = await apiFetch(url, { method: config.method?.toUpperCase(), headers, body: config.data, signal: config.signal as AbortSignal | undefined }, headers.get('x-auth-type') === 'admin' ? 'admin' : 'user');
  const text = await response.text();
  let data: unknown; try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  const result: AxiosResponse = { data, status: response.status, statusText: response.statusText, headers: new AxiosHeaders(Object.fromEntries(response.headers)), config };
  if (!(config.validateStatus?.(response.status) ?? response.ok)) throw new AxiosError('API request failed', AxiosError.ERR_BAD_RESPONSE, config, undefined, result);
  return result;
} });
http.interceptors.response.use((response) => {
  if (response.status !== 204) response.data = unwrapApiEnvelope(response.data);
  return response;
}, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response) {
    const failure = apiFailure(error.response.data, error.response.status), retry = Number(error.response.headers['retry-after']);
    if (error.response.status === 429 && Number.isFinite(retry) && retry > 0) { failure.retryAfterSeconds = Math.ceil(retry); failure.message = `Quá nhiều yêu cầu. Vui lòng thử lại sau ${failure.retryAfterSeconds} giây.`; }
    error.message = failure.message;
    error.response.data = { message: failure.message, code: failure.code, requestId: failure.requestId, details: failure.details, retryAfterSeconds: failure.retryAfterSeconds };
  }
  return Promise.reject(error);
});
export default http;
