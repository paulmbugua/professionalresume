// packages/shared/hooks/useTheme.ts
import React, { createContext, useContext, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useAppQuery from "./useAppQuery";

export type ThemeMode = "light" | "dark";

type ThemeValue = {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
};

type ThemeStorage = {
  read: (key: string) => Promise<ThemeMode | undefined>;
  write: (key: string, value: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/* ---------- default localStorage helpers (web) ---------- */
const readThemeLS = async (storageKey: string): Promise<ThemeMode> => {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(storageKey) as ThemeMode | null;
      if (v === "light" || v === "dark") return v;
    }
  } catch { /* ignore */ }
  return "light";
};

const writeThemeLS = async (storageKey: string, next: ThemeMode) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, next);
    }
  } catch { /* ignore */ }
};

/* ---------- Provider (effect-free) ---------- */
export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  storageKey?: string;
  /** Web-only convenience: toggles Tailwind's `.dark` on <html> */
  applyToDocument?: boolean;
  /** Optional cross-platform storage adapter (e.g., AsyncStorage on RN) */
  storage?: ThemeStorage;
}> = ({ children, storageKey = "theme", applyToDocument = false, storage }) => {
  const qc = useQueryClient();

  const read = async () => {
  const v = storage ? await storage.read(storageKey) : await readThemeLS(storageKey);
  return v ?? "light";
};


  const { data } = useAppQuery<ThemeMode, Error>(
    ["theme", storageKey],
    read,
    {
      staleTime: Infinity,
      gcTime: Infinity,                 // <- v5 name
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const theme = (data ?? "light") as ThemeMode;

  const setTheme = (next: ThemeMode) => {
    (storage?.write(storageKey, next) ?? writeThemeLS(storageKey, next)).catch(() => {});
    qc.setQueryData<ThemeMode>(["theme", storageKey], next);
    if (applyToDocument && typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Ensure <html> class is correct after first resolve, without useEffect
  const appliedRef = useRef<ThemeMode | null>(null);
  if (applyToDocument && typeof document !== "undefined" && appliedRef.current !== theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    appliedRef.current = theme;
  }

  const value: ThemeValue = { theme, setTheme, toggleTheme };
  return React.createElement(ThemeContext.Provider, { value }, children as React.ReactNode);
};

/** Guarded access (throws if no provider) */
export function useThemeProvider() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeProvider must be used within <ThemeProvider>");
  return ctx;
}

/* ---------- Default hook (works with or without provider) ---------- */
export default function useTheme(storageKey = "theme"): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  const qc = useQueryClient();
  const { data } = useAppQuery<ThemeMode, Error>(
    ["theme", storageKey],
    () => readThemeLS(storageKey),
    {
      staleTime: Infinity,
      gcTime: Infinity,                 // <- v5 name
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const theme = (data ?? "light") as ThemeMode;

  const setTheme = (next: ThemeMode) => {
    writeThemeLS(storageKey, next).catch(() => {});
    qc.setQueryData<ThemeMode>(["theme", storageKey], next);
  };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggleTheme };
}
