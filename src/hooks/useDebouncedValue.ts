import { useEffect, useState } from 'react';

/**
 * Retourne la valeur retardée de `delay` ms.
 * Utilisé pour les champs de recherche afin d'éviter un traitement
 * (filtrage, navigation) à chaque frappe.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
