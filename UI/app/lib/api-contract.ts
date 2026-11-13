export type ApiSuccess<T> = { data: T; meta: { requestId: string } };
export type ApiFailure = { error: { code: string; message: string; details: { path: string; code: string }[] }; requestId: string };

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string, public readonly requestId?: string, public readonly details: ApiFailure['error']['details'] = [], public retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function unwrapApiEnvelope<T>(body: unknown): T {
  if (!record(body) || !Object.hasOwn(body, 'data') || !record(body.meta) || typeof body.meta.requestId !== 'string') {
    throw new ApiError('Phản hồi API không hợp lệ.', 502, 'INVALID_API_RESPONSE');
  }
  return body.data as T;
}

export function apiFailure(body: unknown, status: number): ApiError {
  if (record(body) && record(body.error) && typeof body.error.code === 'string' && typeof body.error.message === 'string' && typeof body.requestId === 'string') {
    const details = Array.isArray(body.error.details) ? body.error.details.flatMap((item: unknown) => record(item) && typeof item.path === 'string' && typeof item.code === 'string' ? [{ path: item.path, code: item.code }] : []) : [];
    return new ApiError(body.error.message, status, body.error.code, body.requestId, details);
  }
  return new ApiError('Không thể thực hiện yêu cầu.', status, 'INVALID_API_RESPONSE');
}

// Consumers select a business DTO explicitly; the transport envelope is validated
// here. Unspecified business data stays unknown.
export async function readApiResponse<T = unknown>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiError('Phản hồi API không hợp lệ.', response.status, 'INVALID_API_RESPONSE'); }
  if (!response.ok) {
    const error = apiFailure(body, response.status);
    const retry = Number(response.headers.get('Retry-After'));
    if (response.status === 429 && Number.isFinite(retry) && retry > 0) {
      error.retryAfterSeconds = Math.ceil(retry);
      error.message = `Quá nhiều yêu cầu. Vui lòng thử lại sau ${error.retryAfterSeconds} giây.`;
    }
    throw error;
  }
  return unwrapApiEnvelope<T>(body);
}

export { record as isRecord };
