/**
 * Standard Web Response Helpers for Expo Router API Routes
 */

/**
 * Internal error text (stack messages, Mongo errors, ...) must not reach clients in production.
 * It is only echoed back when running in development or when EXPOSE_ERROR_DETAILS=true.
 * Server errors are always logged so nothing is lost.
 */
function detailsAllowed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.EXPOSE_ERROR_DETAILS === 'true';
}

export function jsonOk<T>(data: T, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function jsonError(
  message: string,
  status = 400,
  details: unknown = null,
  headers: Record<string, string> = {}
): Response {
  if (status >= 500 && details) {
    console.error(`[API ${status}] ${message}`, details);
  }

  return new Response(
    JSON.stringify({
      error: message,
      details: detailsAllowed() ? details : null,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}
