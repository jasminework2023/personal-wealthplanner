const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "/api").trim();

export const API_BASE = configuredApiBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Local/dev: VITE_API_BASE_URL=/api already includes the API prefix.
  // Production: VITE_API_BASE_URL points directly to the Railway host,
  // so the backend route must be /api/<route>.
  if (API_BASE === "/api") return `${API_BASE}${normalizedPath}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${API_BASE}${normalizedPath}`;
  }
  return `${API_BASE}/api${normalizedPath}`;
}
