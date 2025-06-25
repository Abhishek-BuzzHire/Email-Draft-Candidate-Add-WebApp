/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(): void;
    callback: (response: { error?: string }) => void;
  }
  
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: { error?: string }) => void;
  }): TokenClient;
}