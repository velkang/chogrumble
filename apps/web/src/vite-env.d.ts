/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown (WalletConnect) project id from cloud.reown.com; wallet login is off without it. */
  readonly VITE_REOWN_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
