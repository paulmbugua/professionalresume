// apps/mobile/src/components/player/ThemeContext.native.tsx
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

export type HighlightTemplate =
  | 'clean-stripe'
  | 'underline-glow'
  | 'karaoke-glow'
  | 'boxed-pill'
  | 'ribbon';

type ThemeContextValue = {
  // Core tokens
  hlHex: string;           // highlight color
  genHex: string;          // general text color for "past" words
  activeTextOnHl: string;  // text color on highlight

  // Template
  templateId: HighlightTemplate;

  // Mutators
  setTemplateId: (t: HighlightTemplate) => void;
  setHighlightColor: (hex: string) => void;
  applyPreset: (key: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_HL = '#f97316';       // orange-400-ish
const DEFAULT_GEN = '#e5e7eb';      // slate-200
const DEFAULT_ACTIVE_ON_HL = '#020617'; // slate-950

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hlHex, setHlHex] = useState(DEFAULT_HL);
  const [genHex, setGenHex] = useState(DEFAULT_GEN);
  const [activeTextOnHl, setActiveTextOnHl] = useState(DEFAULT_ACTIVE_ON_HL);
  const [templateId, setTemplateId] =
    useState<HighlightTemplate>('boxed-pill');

  const applyPreset = (key: string) => {
    switch (key) {
      case 'sky':
        setHlHex('#0ea5e9'); // sky-500
        setGenHex('#e5e7eb');
        setActiveTextOnHl('#020617');
        break;
      case 'lime':
        setHlHex('#84cc16'); // lime-500
        setGenHex('#e5e7eb');
        setActiveTextOnHl('#020617');
        break;
      case 'violet':
        setHlHex('#8b5cf6'); // violet-500
        setGenHex('#e5e7eb');
        setActiveTextOnHl('#f9fafb');
        break;
      case 'amber':
        setHlHex('#fbbf24'); // amber-400
        setGenHex('#e5e7eb');
        setActiveTextOnHl('#020617');
        break;
      case 'rose':
        setHlHex('#f97373'); // soft rose-ish
        setGenHex('#e5e7eb');
        setActiveTextOnHl('#020617');
        break;
      case 'default':
      default:
        setHlHex(DEFAULT_HL);
        setGenHex(DEFAULT_GEN);
        setActiveTextOnHl(DEFAULT_ACTIVE_ON_HL);
        break;
    }
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      hlHex,
      genHex,
      activeTextOnHl,
      templateId,
      setTemplateId,
      setHighlightColor: setHlHex,
      applyPreset,
    }),
    [hlHex, genHex, activeTextOnHl, templateId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeTokens(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeTokens must be used within ThemeProvider');
  }
  return ctx;
}
