export async function fetchApi<T>(routeUrl: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(routeUrl, options);
  const body = await res.json() as T;

  if (!res.ok) {
    const detail = (body as { detail?: string }).detail ?? res.statusText;
    throw new Error(`HTTP ${res.status} : ${detail}`);
  }
  return body;
}
