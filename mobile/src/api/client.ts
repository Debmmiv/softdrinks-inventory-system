// TODO: replace with your computer's local IP address (run ipconfig) while testing.
export const API_URL = 'http://192.168.1.11:3000';

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
