/**
 * FlowBoard API Client Utility
 * Handles resolving API URLs reliably across local, production, and custom domain hosting environments.
 */

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  if (baseUrl && typeof baseUrl === 'string') {
    const trimmed = baseUrl.trim();
    // If running in browser and baseUrl points to localhost/127.0.0.1 while site is hosted on Cloud Run / external origin, fallback to relative path
    if (typeof window !== 'undefined' && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) && !window.location.hostname.includes('localhost')) {
      return cleanPath;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      const cleanBase = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
      return `${cleanBase}${cleanPath}`;
    }
  }
  return cleanPath;
}
