/**
 * FlowBoard API Client Utility
 * Handles resolving API URLs reliably across local, preview, and custom domain hosting environments.
 */

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
  
  if (baseUrl && typeof baseUrl === 'string') {
    const trimmed = baseUrl.trim();
    
    // In browser environment:
    if (typeof window !== 'undefined') {
      // If baseUrl is localhost while running on non-localhost, fallback to relative path
      if ((trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) && !window.location.hostname.includes('localhost')) {
        return cleanPath;
      }
      // If baseUrl matches current origin, use relative cleanPath
      try {
        if (new URL(trimmed).origin === window.location.origin) {
          return cleanPath;
        }
      } catch (e) {
        // Not a valid absolute URL, fallback to relative
        return cleanPath;
      }
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      const cleanBase = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
      return `${cleanBase}${cleanPath}`;
    }
  }

  // Default to relative API route which works seamlessly with Express + Vite on the same origin
  return cleanPath;
}

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  rawText?: string;
}

/**
 * Safely executes a fetch call, preventing SyntaxError when servers return HTML 404/500 error pages.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    let parsedData: T | null = null;
    if (contentType.includes('application/json') || (text.trim().startsWith('{') || text.trim().startsWith('['))) {
      try {
        parsedData = JSON.parse(text) as T;
      } catch (jsonErr) {
        console.warn(`[safeFetchJson] Failed to parse JSON response from ${url}:`, jsonErr);
      }
    }

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: parsedData,
        rawText: text,
      };
    } else {
      const errMessage = (parsedData as any)?.error || (parsedData as any)?.message || `HTTP ${response.status}: ${response.statusText}`;
      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: errMessage,
        rawText: text,
      };
    }
  } catch (err: any) {
    console.warn(`[safeFetchJson] Network request failed for ${url}:`, err?.message || err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network request failed',
    };
  }
}
