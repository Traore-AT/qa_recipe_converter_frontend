/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API (ex. https://api.example.com/api) — défaut : '/api' */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
