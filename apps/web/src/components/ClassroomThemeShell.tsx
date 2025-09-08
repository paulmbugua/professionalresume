// apps/web/src/components/ClassroomThemeShell.tsx
import ReactDOM from 'react-dom';
import React, { useMemo, useState, useEffect } from 'react';
import ClassroomPlayer from './ClassroomPlayer.web';
import ClassroomBackdrop from './ClassroomBackdrop.web';
import { DARK_PRESET_THEMES } from '@/utils/backdropThemes';

type ThemeMode = 'auto' | 'preset';

const read = (k: string, f: string) => {
  try {
    return localStorage.getItem(k) ?? f;
  } catch {
    return f;
  }
};
const readN = (k: string, f: number) => {
  try {
    const v = parseFloat(localStorage.getItem(k) || '');
    return isNaN(v) ? f : v;
  } catch {
    return f;
  }
};

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 0.01, onChange }) => (
  <div>
    <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
      <span className="text-white/85">{label}</span>
      <span className="text-white/60 tabular-nums">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-white"
    />
  </div>
);

type ClassroomThemeShellProps = Record<string, any> & {
  /** Controls whether the Theme panel is open (optional controlled prop) */
  themeOpen?: boolean;
  /** Called when the Theme panel open state changes (for controlled mode) */
  onThemeOpenChange?: (open: boolean) => void;
  /** Show the floating Theme button overlay (defaults to true) */
  showFloatingThemeButton?: boolean;
};

/** Wraps ClassroomPlayer and injects a themeable backdrop + a small Theme panel. */
const ClassroomThemeShell: React.FC<ClassroomThemeShellProps> = (props) => {
  // Controlled/uncontrolled Theme panel open state
  const [internalThemeOpen, setInternalThemeOpen] = useState(false);
  const isControlled = typeof props.themeOpen === 'boolean';
  const showTheme = isControlled ? (props.themeOpen as boolean) : internalThemeOpen;
  const setShowTheme = (v: boolean | ((s: boolean) => boolean)) => {
    const next = typeof v === 'function' ? (v as (s: boolean) => boolean)(showTheme) : v;
    if (!isControlled) setInternalThemeOpen(next);
    props.onThemeOpenChange?.(next);
  };

  // Theme state (persisted)
  const [mode, setMode] = useState<ThemeMode>(() => read('cb_themeMode', 'auto') as ThemeMode);
  const [presetIndex, setPresetIndex] = useState<number>(() => readN('cb_presetIndex', 0));

  const [dim, setDim] = useState<number>(() => readN('cb_dim', 0.35));
  const [brightness, setBrightness] = useState<number>(() => readN('cb_brightness', 0.6));
  const [saturation, setSaturation] = useState<number>(() => readN('cb_saturation', 0.9));
  const [blurPx, setBlurPx] = useState<number>(() => readN('cb_blurPx', 2));
  const [vignetteInner, setVignetteInner] = useState<number>(() => readN('cb_vignetteInner', 0.45));

  useEffect(() => {
    try {
      localStorage.setItem('cb_themeMode', mode);
    } catch {}
  }, [mode]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_presetIndex', String(presetIndex));
    } catch {}
  }, [presetIndex]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_dim', String(dim));
    } catch {}
  }, [dim]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_brightness', String(brightness));
    } catch {}
  }, [brightness]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_saturation', String(saturation));
    } catch {}
  }, [saturation]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_blurPx', String(blurPx));
    } catch {}
  }, [blurPx]);
  useEffect(() => {
    try {
      localStorage.setItem('cb_vignetteInner', String(vignetteInner));
    } catch {}
  }, [vignetteInner]);

  const imagesOverride = useMemo(() => {
    if (mode !== 'preset') return undefined;
    const idx = Math.max(0, Math.min(DARK_PRESET_THEMES.length - 1, presetIndex));
    return [DARK_PRESET_THEMES[idx]];
  }, [mode, presetIndex]);

  // Build the override backdrop node
  const backdropOverride = (
    <ClassroomBackdrop
      course={props.course || null}
      outline={props.outline}
      backendUrl={props.backendUrlOverride}
      playing={typeof props.playing === 'boolean' ? props.playing : undefined}
      intervalSec={14}
      dim={dim}
      brightness={brightness}
      saturation={saturation}
      blurPx={blurPx}
      vignetteInner={vignetteInner}
      imagesOverride={imagesOverride}
    />
  );

  return (
    <div className="relative">
      <ClassroomPlayer {...props} disableInternalBackdrop backdropOverride={backdropOverride} onToggleThemePanel={() => setShowTheme((s) => !s)} />

      {/* Floating Theme button + Panel rendered at the page root */}
{typeof document !== 'undefined' &&
  ReactDOM.createPortal(
    <>
      {props.showFloatingThemeButton !== false && (
        <button
          onClick={() => setShowTheme((s) => !s)}
          className="fixed z-[11000] bottom-[88px] right-3 sm:right-4 px-3 py-2 rounded-xl bg-black/80 text-white text-xs sm:text-sm ring-1 ring-white/10 hover:bg-black/70"
          title="Theme"
          aria-label="Theme"
        >
          Theme
        </button>
      )}

      {showTheme && (
        <>
          {/* Scrim so it clearly sits above page content */}
          <div
            className="fixed inset-0 z-[10990] bg-black/40"
            onClick={() => setShowTheme(false)}
            aria-hidden="true"
          />

          <div className="fixed z-[11000] bottom-[140px] right-3 sm:right-4 w-[min(92vw,460px)] rounded-2xl
                          bg-black text-white ring-1 ring-white/10 backdrop-blur-md shadow-2xl p-3 sm:p-4">
            {/* (unchanged) panel header + sliders... */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm sm:text-base font-semibold">Theme</div>
              <button onClick={() => setShowTheme(false)} className="text-white/80 hover:text-white" aria-label="Close">✕</button>
            </div>

            {/* ...rest of your Theme panel content stays the same... */}
          </div>
        </>
      )}
    </>,
    document.body
  )
}

      {/* Theme Panel */}
      {showTheme && (
        <div className="fixed z-[10060] bottom-[140px] right-3 sm:right-4 w-[min(92vw,460px)] rounded-2xl bg-black/70 text-white ring-1 ring-white/10 backdrop-blur-md shadow-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm sm:text-base font-semibold">Theme</div>
            <button
              onClick={() => setShowTheme(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm mb-3">
            <button
              onClick={() => setMode('auto')}
              className={`px-3 py-1.5 rounded-full ring-1 ${
                mode === 'auto'
                  ? 'bg-white text-black ring-white'
                  : 'bg-white/10 text-white/85 ring-white/20 hover:bg-white/15'
              }`}
            >
              Auto (subject-aware)
            </button>
            <button
              onClick={() => setMode('preset')}
              className={`px-3 py-1.5 rounded-full ring-1 ${
                mode === 'preset'
                  ? 'bg-white text-black ring-white'
                  : 'bg-white/10 text-white/85 ring-white/20 hover:bg-white/15'
              }`}
            >
              Presets
            </button>
          </div>

          {mode === 'preset' && (
            <div className="grid grid-cols-5 gap-2 mb-4">
              {DARK_PRESET_THEMES.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setPresetIndex(i)}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden ring-2 ${
                    presetIndex === i ? 'ring-white' : 'ring-transparent hover:ring-white/40'
                  }`}
                  title={`Preset ${i + 1}`}
                >
                  <img src={src} alt={`Preset ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  {presetIndex === i && (
                    <div className="absolute inset-0 bg-black/20 grid place-items-center text-white text-xs font-semibold">
                      Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <SliderRow label="Darken" value={dim} min={0} max={0.85} step={0.01} onChange={setDim} />
            <SliderRow label="Brightness" value={brightness} min={0.3} max={1.2} step={0.01} onChange={setBrightness} />
            <SliderRow label="Saturation" value={saturation} min={0.6} max={1.3} step={0.01} onChange={setSaturation} />
            <SliderRow label="Blur" value={blurPx} min={0} max={6} step={0.5} onChange={setBlurPx} />
            <SliderRow
              label="Vignette Center"
              value={vignetteInner}
              min={0.2}
              max={0.7}
              step={0.01}
              onChange={setVignetteInner}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
            <button
              onClick={() => {
                setDim(0.4);
                setBrightness(0.6);
                setSaturation(0.95);
                setBlurPx(2);
                setVignetteInner(0.45);
              }}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 ring-1 ring-white/20"
            >
              Reset nice dark
            </button>
            <button
              onClick={() => {
                setDim(0.2);
                setBrightness(0.8);
                setSaturation(1.05);
                setBlurPx(0);
                setVignetteInner(0.5);
              }}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 ring-1 ring-white/20"
            >
              Brighter
            </button>
            <button
              onClick={() => {
                setDim(0.6);
                setBrightness(0.5);
                setSaturation(0.9);
                setBlurPx(3);
                setVignetteInner(0.4);
              }}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 ring-1 ring-white/20"
            >
              Super dim
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomThemeShell;
