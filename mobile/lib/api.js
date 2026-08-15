import { Platform } from 'react-native';
import { getBackendAuthToken } from './appwrite';

/**
 * Resolving the backend URL on a phone/emulator is not the same problem
 * as on a browser (web's lib/api.js just defaults to localhost, since
 * browser and server are the same machine in dev). Here:
 *   - Android emulator can't see the host machine as "localhost" — it
 *     needs the special alias 10.0.2.2.
 *   - iOS simulator *can* use localhost (it shares the host's network).
 *   - A physical device on the same Wi-Fi needs the host machine's real
 *     LAN IP — neither of the above works, so EXPO_PUBLIC_API_URL must be
 *     set (e.g. in mobile/.env: EXPO_PUBLIC_API_URL=http://192.168.1.23:4000).
 * Expo's Metro bundler embeds EXPO_PUBLIC_* env vars automatically — no
 * extra config package needed (SDK 49+).
 */
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function request(path, { method = 'GET', body } = {}) {
    const token = await getBackendAuthToken();

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return null;

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
        const message = payload?.error || `Request failed with status ${res.status}`;
        throw new ApiError(res.status, message);
    }

    return payload;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: 'POST', body });
export const apiPut = (path, body) => request(path, { method: 'PUT', body });
export const apiDelete = (path) => request(path, { method: 'DELETE' });

/**
 * For non-JSON responses (CSV export) — same auth header as everything
 * else, but returns plain text instead of trying to JSON-parse it. The
 * caller (AnalysisScreen) hands the text to the native Share sheet since
 * mobile has no browser-style "click to download a file" affordance.
 */
export async function apiGetText(path) {
    const token = await getBackendAuthToken();
    const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new ApiError(res.status, payload?.error || `Request failed with status ${res.status}`);
    }

    return res.text();
}

export { API_URL };
