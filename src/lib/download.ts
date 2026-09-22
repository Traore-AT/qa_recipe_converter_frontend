/**
 * Extrait le nom de fichier d'un en-tête HTTP `Content-Disposition`.
 * Retourne `null` si l'en-tête est absent ou non exploitable.
 */
export function filenameFromDisposition(disposition?: string | null): string | null {
  if (!disposition) return null;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const classic = disposition.match(/filename="?([^";\n]+)"?/i);
  return classic?.[1]?.trim() || null;
}

/**
 * Déclenche le téléchargement d'un blob côté navigateur puis libère l'URL
 * temporaire (évite les fuites mémoire des `URL.createObjectURL` non révoquées).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
