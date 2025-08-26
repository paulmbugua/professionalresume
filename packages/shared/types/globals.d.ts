// packages/shared/types/globals.d.ts
declare global {
  interface FormData {
    append(name: string, file: { uri: string; name?: string; type?: string }): void;
  }
}
export {};
