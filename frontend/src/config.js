// Central place for frontend runtime configuration.
// Vite exposes env vars on import.meta.env (only those prefixed with VITE_).

export const API_BASE_URL = (
    import.meta.env.VITE_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000'
).replace(/\/+$/, '');
