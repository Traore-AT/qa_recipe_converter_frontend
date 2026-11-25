/** Destination après connexion : uniquement un chemin interne (pas de redirection ouverte). */
export function safeNext(next: string | null): string {
  if (!next || !/^\/(?![/\\])/.test(next) || next.startsWith('/login')) return '/';
  return next;
}

/** Lien d'authentification qui conserve la page demandée. */
export function authLink(path: '/login' | '/register', next: string): string {
  return next === '/' ? path : `${path}?next=${encodeURIComponent(next)}`;
}
