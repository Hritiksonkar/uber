// Centralized runtime configuration for API + Socket endpoints.
// Vite only exposes env vars prefixed with VITE_.

const normalizeBaseUrl = (value) => {
    const url = (value || '').trim();
    if (!url) return '';
    return url.replace(/\/+$/, '');
};

const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL);

export const API_BASE_URL = envBaseUrl || 'http://localhost:3000';
export const SOCKET_URL = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL) || API_BASE_URL;
