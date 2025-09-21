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

/* ---------- NEW: applier registry (no RN imports in shared) ---------- */
export type ThemeApplier = (mode: ThemeMode) => void;
const themeAppliers = new Set<ThemeApplier>();
export function registerThemeApplier(applier: ThemeApplier) {
  themeAppliers.add(applier);
  return () => themeAppliers.delete(applier);
}

/* ---------- localStorage helpers (web) ---------- */
const readThemeLS = async (storageKey: string): Promise<ThemeMode> => {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(storageKey) as ThemeMode | null;
      if (v === "light" || v === "dark") return v;
    }
  } catch {}
  return "light";
};
const writeThemeLS = async (storageKey: string, next: ThemeMode) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, next);
    }
  } catch {}
};

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  storageKey?: string;
  applyToDocument?: boolean; // web only
  storage?: ThemeStorage;    // supply AsyncStorage adapter from RN
}> = ({ children, storageKey = "theme", applyToDocument = false, storage }) => {
  const qc = useQueryClient();

  const read = async () => {
    const v = storage ? await storage.read(storageKey) : await readThemeLS(storageKey);
    return v ?? "light";
  };

  const { data } = useAppQuery<ThemeMode, Error>(
    ["theme", storageKey],
    read,
    { staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchOnReconnect: false, refetchOnWindowFocus: false }
  );

  const theme = (data ?? "light") as ThemeMode;

  const setTheme = (next: ThemeMode) => {
    (storage?.write(storageKey, next) ?? writeThemeLS(storageKey, next)).catch(() => {});
    qc.setQueryData<ThemeMode>(["theme", storageKey], next);

    // Notify platform appliers (RN will call tw.setColorScheme here)
    themeAppliers.forEach(fn => {
      try { fn(next); } catch {}
    });

    // Web: toggle <html>.dark if asked
    if (applyToDocument && typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Initial sync to appliers and <html> (no useEffect)
  const appliedRef = useRef<ThemeMode | null>(null);
  if (appliedRef.current !== theme) {
    themeAppliers.forEach(fn => {
      try { fn(theme); } catch {}
    });
    if (applyToDocument && typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    appliedRef.current = theme;
  }

  const value: ThemeValue = { theme, setTheme, toggleTheme };
  return React.createElement(ThemeContext.Provider, { value }, children as React.ReactNode);
};

export function useThemeProvider() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeProvider must be used within <ThemeProvider>");
  return ctx;
}

export default function useTheme(storageKey = "theme"): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  const qc = useQueryClient();
  const { data } = useAppQuery<ThemeMode, Error>(
    ["theme", storageKey],
    () => readThemeLS(storageKey),
    { staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchOnReconnect: false, refetchOnWindowFocus: false }
  );

  const theme = (data ?? "light") as ThemeMode;

  const setTheme = (next: ThemeMode) => {
    writeThemeLS(storageKey, next).catch(() => {});
    qc.setQueryData<ThemeMode>(["theme", storageKey], next);
    themeAppliers.forEach(fn => { try { fn(next); } catch {} });
  };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggleTheme };
}
