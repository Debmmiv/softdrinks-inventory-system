/**
 * Standard Web Response Helpers for Expo Router API Routes
 */

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
  return new Response(
    JSON.stringify({
      error: message,
      details,
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
