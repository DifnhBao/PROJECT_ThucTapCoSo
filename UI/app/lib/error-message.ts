// Transport errors (ApiError/AxiosError) already normalize their public message.
export function errorMessage(error: unknown, fallback = 'Không thể thực hiện yêu cầu.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
