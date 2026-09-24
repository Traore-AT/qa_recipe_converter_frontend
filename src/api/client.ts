import axios, { type InternalAxiosRequestConfig } from 'axios';

let csrfToken = '';

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

function getCsrfToken(): string {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const client = axios.create({
  // Base URL configurable via VITE_API_URL (défaut : '/api' — proxifié en dev, nginx en prod)
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

client.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken && config.method && !/^get$/i.test(config.method)) {
    config.headers.set('X-CSRFToken', csrfToken);
  }
  return config;
});

// Endpoints d'authentification exclus de la redirection automatique sur 401
const AUTH_EXEMPT_PATTERNS = ['/auth/login/', '/auth/register/', '/auth/me/', '/auth/password-reset'];

client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const data = error.response.data as { detail?: unknown } | null;
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      if (detail.includes('CSRF')) {
        const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        if (config && !config._retry) {
          config._retry = true;
          try {
            const r = await client.get<{ csrfToken: string }>('/csrf/');
            setCsrfToken(r.data.csrfToken);
            config.headers.set('X-CSRFToken', r.data.csrfToken);
            return client.request(config);
          } catch {
            // fall through to generic error handling
          }
        }
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      if (config?._retry) return Promise.reject(error);
      const url = config?.url ?? '';
      const isAuthCall = AUTH_EXEMPT_PATTERNS.some((p) => url.includes(p));
      const alreadyOnLogin = window.location.pathname.startsWith('/login');
      if (!isAuthCall && !alreadyOnLogin && config) {
        // Session expirée : redirige vers /login (une seule fois par requête)
        config._retry = true;
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(error);
  },
);

/** Nature de l'échec, utile pour adapter l'UX (retry, message, formulaire). */
export type ApiErrorKind = 'network' | 'timeout' | 'canceled' | 'http' | 'unknown';

/** Erreur API normalisée, quelle que soit la forme renvoyée par le backend. */
export interface ApiErrorInfo {
  kind: ApiErrorKind;
  status: number | null;
  /** Message global renvoyé par DRF (`detail`, `error`) ou déduit du code HTTP. */
  detail: string | null;
  /** Erreurs par champ (`{ champ: 'message' }`), pour la validation de formulaire. */
  fieldErrors: Record<string, string>;
  /** Charge utile brute, pour les cas spécifiques. */
  raw: unknown;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Requête invalide. Vérifiez les informations saisies.',
  401: 'Votre session a expiré. Veuillez vous reconnecter.',
  403: "Vous n'avez pas les droits nécessaires pour cette action.",
  404: 'Ressource introuvable. Elle a peut-être été supprimée.',
  405: 'Action non autorisée sur cette ressource.',
  409: 'Conflit : la ressource a été modifiée entre-temps. Rechargez la page.',
  413: 'Fichier trop volumineux pour le serveur.',
  415: 'Format de fichier non pris en charge par le serveur.',
  422: 'Le document a bien été reçu mais aucun tableau exploitable n’a été trouvé.',
  429: 'Trop de requêtes envoyées. Merci de patienter quelques instants.',
  500: 'Erreur serveur pendant le traitement. Veuillez réessayer.',
  502: 'Le serveur est momentanément indisponible. Veuillez réessayer.',
  503: 'Service momentanément indisponible. Veuillez réessayer dans un instant.',
  504: 'Le serveur met trop de temps à répondre. Veuillez réessayer.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Aplatit une erreur DRF (chaîne, liste ou objet imbriqué) en un message unique. */
function flatten(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(' ');
  if (isRecord(value)) return Object.values(value).map(flatten).filter(Boolean).join(' ');
  return '';
}

/** Normalise les erreurs par champ d'un serializer DRF. */
function collectFieldErrors(data: Record<string, unknown>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail' || key === 'error') continue;
    const message = flatten(value);
    if (message) fieldErrors[key] = message;
  }
  return fieldErrors;
}

/**
 * Convertit n'importe quelle erreur (DRF `{detail}`, `{error}`, erreurs par
 * champ, erreur réseau, timeout, annulation) en structure exploitable par l'UI.
 */
export function extractApiError(error: unknown): ApiErrorInfo {
  if (axios.isCancel(error)) {
    return { kind: 'canceled', status: null, detail: null, fieldErrors: {}, raw: error };
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        kind: 'timeout',
        status: null,
        detail: 'La requête a expiré. Vérifiez votre connexion puis réessayez.',
        fieldErrors: {},
        raw: error,
      };
    }
    if (!error.response) {
      return {
        kind: 'network',
        status: null,
        detail: 'Impossible de joindre le serveur. Vérifiez votre connexion réseau.',
        fieldErrors: {},
        raw: error,
      };
    }

    const { status, data } = error.response;
    let detail: string | null = null;
    let fieldErrors: Record<string, string> = {};

    if (typeof data === 'string' && data.trim()) {
      detail = data.trim();
    } else if (isRecord(data)) {
      if (typeof data.detail === 'string') detail = data.detail;
      else if (typeof data.error === 'string') detail = data.error;
      fieldErrors = collectFieldErrors(data);
      if (!detail && Object.keys(fieldErrors).length > 0) {
        detail = Object.values(fieldErrors)[0];
      }
    }

    if (!detail) detail = STATUS_MESSAGES[status] ?? `Erreur inattendue (HTTP ${status}).`;
    return { kind: 'http', status, detail, fieldErrors, raw: error };
  }

  if (error instanceof Error && error.message) {
    return { kind: 'unknown', status: null, detail: error.message, fieldErrors: {}, raw: error };
  }

  // Erreurs « pseudo-axios » : objet `{ response: { data, status } }` (tests,
  // erreurs sérialisées) ou dictionnaire DRF passé directement.
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : null;
    const payload = response?.data ?? (response ? null : error);
    const status = typeof response?.status === 'number' ? response.status : null;

    if (typeof payload === 'string' && payload.trim()) {
      return { kind: 'http', status, detail: payload.trim(), fieldErrors: {}, raw: error };
    }
    if (isRecord(payload)) {
      const detail =
        (typeof payload.detail === 'string' && payload.detail) ||
        (typeof payload.error === 'string' && payload.error) ||
        null;
      const fieldErrors = collectFieldErrors(payload);
      const message = detail || Object.values(fieldErrors)[0] || (status ? STATUS_MESSAGES[status] ?? null : null);
      if (message) {
        return { kind: 'http', status, detail: message, fieldErrors, raw: error };
      }
    }
  }

  return { kind: 'unknown', status: null, detail: null, fieldErrors: {}, raw: error };
}

export default client;
