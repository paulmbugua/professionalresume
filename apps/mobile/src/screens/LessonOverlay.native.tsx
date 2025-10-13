import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  PanResponder,
  PanResponderInstance,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../tailwind';
import Markdown from '../screens/Markdown.native';

/* ── Types ───────────────────────────────── */
type Word = { text: string; start: number; end: number };

type Formula = {
  id: string;
  latex: string;
  title?: string;
  speakAs?: 'math' | 'spell-out' | 'characters' | 'none';
  variables?: { symbol: string; meaning: string }[];
  announceAtSentence?: number; // 1-based
};

type Table = {
  id?: string;
  title: string;
  columns: string[];
  rows: (string | number | boolean)[][];
  caption?: string;
  announceAtSentence?: number; // 1-based
};

type ImageItem = {
  id: string;
  title?: string;
  alt?: string;
  url?: string;
  caption?: string;
  announceAtSentence?: number;
};

type ChartItem = {
  id: string;
  title?: string;
  kind?: 'bar' | 'line' | 'pie' | 'histogram' | 'scatter' | 'box' | 'heatmap' | 'other';
  alt?: string;
  url?: string;
  svg?: string; // unused on native
  caption?: string;
  announceAtSentence?: number;
};

type SnippetItem = {
  id: string;
  title?: string;
  language?: string;
  code: string;
  explanation?: string;
  announceAtSentence?: number;
};

type LessonLike = {
  id: string;
  title?: string;
  markdown?: string;
  formulas?: Formula[];
  tables?: Table[];
  images?: ImageItem[];
  snippets?: SnippetItem[];
  charts?: ChartItem[];
};

export interface LessonOverlayProps {
  words: Word[];
  currentIndex: number;
  lesson?: LessonLike | null;

  topOffset?: number;
  lingerMs?: number;
  defaultPinned?: boolean;
  rememberKey?: string;
  zIndex?: number;
  freeMove?: boolean;
  fullOnMaximize?: boolean;
}

/* ── Helpers ─────────────────────────────── */
type OverlayItem =
  | { kind: 'formula'; at: number; key: string; md: string; title?: string; speakAs?: string }
  | { kind: 'table';   at: number; key: string; md: string; title?: string }
  | { kind: 'image';   at: number; key: string; md: string; title?: string }
  | { kind: 'snippet'; at: number; key: string; md: string; title?: string; language?: string }
  | { kind: 'chart';   at: number; key: string; md: string; title?: string };

const SENTENCE_END = /[.!?…]+["')\]]?$/;
const groupSignature = (arr: OverlayItem[]) =>
  arr.map((it) => `${it.key}:${it.md.length}`).sort().join('|');

function renderGfmTable(t: { title?: string; caption?: string; columns: string[]; rows: (string | number | boolean)[][] }) {
  const head = `| ${t.columns.join(' | ')} |\n| ${t.columns.map(() => '---').join(' | ')} |`;
  const body = (t.rows || []).map((r) => `| ${r.map((x) => String(x)).join(' | ')} |`).join('\n');
  return `\n**${t.title || 'Table'}**${t.caption ? ` — _${t.caption}_` : ''}\n\n${head}\n${body}\n`;
}

const KIND_LABEL: Record<OverlayItem['kind'], string> = {
  formula: 'Formula',
  table: 'Table',
  image: 'Illustration',
  snippet: 'Code',
  chart: 'Chart',
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ── Component ───────────────────────────── */
const LessonOverlayNative: React.FC<LessonOverlayProps> = ({
  words,
  currentIndex,
  lesson,
  topOffset = 56,
  lingerMs = 6000,
  defaultPinned = true,
  rememberKey,
  zIndex = 10000, // not critical in Modal but kept for consistency
  freeMove = true,
  fullOnMaximize = true,
}) => {
  const { width: WIN_W, height: WIN_H } = useWindowDimensions();
  const isPortrait = WIN_H >= WIN_W;

  // ✨ Mobile-first sheet mode
  const SMALL_PHONE = WIN_W <= 390;
  const SHEET_MODE = isPortrait && WIN_W <= 480;

  const MARGIN = 8;
  const HEADER_H = 44 + (Platform.OS === 'ios' ? 6 : 0);

  /* 1) Sentence ranges */
  const sentences = useMemo(() => {
    if (!words.length) return [] as { startWi: number; endWi: number; index: number }[];
    const spans: { startWi: number; endWi: number; index: number }[] = [];
    let start = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]?.text || '';
      if (SENTENCE_END.test(w)) {
        spans.push({ startWi: start, endWi: i, index: spans.length });
        start = i + 1;
      }
    }
    if (start < words.length) spans.push({ startWi: start, endWi: words.length - 1, index: spans.length });
    return spans;
  }, [words]);

  const currentSentenceIndex = useMemo(() => {
    if (!sentences.length) return 0;
    const idx = sentences.findIndex((s) => currentIndex >= s.startWi && currentIndex <= s.endWi);
    return idx === -1 ? 0 : idx;
  }, [sentences, currentIndex]);

  /* 2) Build items tied to sentences */
  const items = useMemo<OverlayItem[]>(() => {
    if (!lesson) return [];
    const normalizeAt = (n?: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n - 1)) : undefined;
    const onlyOneSentence = sentences.length <= 1;
    const atFor = (n?: number) => (onlyOneSentence ? 0 : normalizeAt(n));

    const out: OverlayItem[] = [];

    (lesson.formulas || []).forEach((f, i) => {
      const at0 = atFor(f.announceAtSentence);
      if (typeof at0 === 'number') {
        const varsMd =
          Array.isArray(f.variables) && f.variables.length
            ? `\n\n**Variables**\n${f.variables.map((v) => `- **${v.symbol}** — ${v.meaning}`).join('\n')}`
            : '';
        const readLine = f.speakAs ? `\n\n_Read as_: ${f.speakAs}` : '';
        const md = `**${f.title || f.id || 'Formula'}**\n\n\`\`\`math\n${f.latex || ''}\n\`\`\`${varsMd}${readLine}`;
        out.push({ kind: 'formula', at: at0, key: `F${i}:${f.id || i}`, md, title: f.title || f.id, speakAs: f.speakAs });
      }
    });

    (lesson.charts || []).forEach((ch, i) => {
      const at0 = atFor(ch.announceAtSentence);
      if (typeof at0 === 'number') {
        const caption = ch.caption ? `\n\n_${ch.caption}_` : '';
        const kind = ch.kind ?? '';
        const label = ch.title ?? (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Chart');
        const imgMd = ch.url ? `\n\n![${label}](${ch.url})` : '';
        const md = `**${label}**${caption}${imgMd}`;
        out.push({ kind: 'chart', at: at0, key: `H${i}:${ch.id || i}`, md, title: ch.title });
      }
    });

    (lesson.tables || []).forEach((t, i) => {
      const at0 = atFor(t.announceAtSentence);
      if (typeof at0 === 'number' && (t.columns?.length || 0) && (t.rows?.length || 0)) {
        out.push({ kind: 'table', at: at0, key: `T${i}:${t.title || i}`, md: renderGfmTable(t), title: t.title });
      }
    });

    (lesson.images || []).forEach((im, i) => {
      const at0 = atFor(im.announceAtSentence);
      if (typeof at0 === 'number') {
        const caption = im.caption ? `\n\n_${im.caption}_` : '';
        const md = im.url
          ? `**${im.title || 'Illustration'}**${caption}\n\n![${im.title || 'Illustration'}](${im.url})`
          : `**${im.title || 'Illustration'}**${caption}`;
        out.push({ kind: 'image', at: at0, key: `I${i}:${im.id || i}`, md, title: im.title });
      }
    });

    (lesson.snippets || []).forEach((sn, i) => {
      const at0 = atFor(sn.announceAtSentence);
      if (typeof at0 === 'number' && (sn.code || '').trim()) {
        const head = `**${sn.title || 'Code snippet'}**${sn.explanation ? ` — _${sn.explanation}_` : ''}\n\n`;
        const lang = (sn.language || '').toLowerCase();
        const md = `${head}\`\`\`${lang}\n${sn.code}\n\`\`\``;
        out.push({ kind: 'snippet', at: at0, key: `C${i}:${sn.id || i}`, md, title: sn.title, language: sn.language });
      }
    });

    if (!out.length && typeof lesson.markdown === 'string' && lesson.markdown) {
      const m = lesson.markdown.match(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/);
      if (m) {
        const alt = (m[1] || 'Illustration').replace(/\|/g, '-');
        const url = m[2];
        const md = `**Illustration**\n\n![${alt}](${url})`;
        out.push({ kind: 'image', at: 0, key: `I0:fallback`, md, title: 'Illustration' });
      } else {
        const preview = lesson.markdown.split('\n').slice(0, 12).join('\n').trim();
        if (preview) {
          const md = `**Notes**\n\n${preview}`;
          out.push({ kind: 'table', at: 0, key: `N0:fallback`, md, title: 'Notes' });
        }
      }
    }

    return out.sort((a, b) => a.at - b.at);
  }, [lesson, sentences.length]);

  const latestIdx = useMemo(() => {
    if (!items.length) return -1;
    let idx = -1;
    for (const [i, it] of items.entries()) {
      if (it.at <= currentSentenceIndex) idx = i;
      else break;
    }
    return idx;
  }, [items, currentSentenceIndex]);

  /* 3) Position/size/persistence — responsive defaults */
  type Saved = { x: number; y: number; w: number; h: number; pinned: boolean; maximized: boolean; minimized: boolean; zoom: number; };

  const defaultWidth  = SHEET_MODE ? WIN_W - MARGIN * 2 : clamp(Math.floor(WIN_W - MARGIN * 2), 320, 560);
  const defaultHeight = SHEET_MODE
    ? clamp(Math.floor(WIN_H * 0.52), Math.floor(WIN_H * 0.38), Math.floor(WIN_H * 0.9))
    : clamp(Math.floor((isPortrait ? WIN_H * 0.5 : WIN_H * 0.45) - topOffset), Math.floor(WIN_H * 0.4), Math.floor(WIN_H - MARGIN * 2));

  const sheetSnapTop = Math.max(topOffset + MARGIN, Math.floor(WIN_H * 0.08));
  const sheetSnapMid = Math.floor(WIN_H * (SMALL_PHONE ? 0.56 : 0.5));
  const sheetSnapLow = Math.floor(WIN_H - (SMALL_PHONE ? 120 : 140));

  const defaultSaved: Saved = {
    x: SHEET_MODE ? MARGIN : MARGIN,
    y: SHEET_MODE ? sheetSnapMid : clamp(topOffset + MARGIN, MARGIN, WIN_H - defaultHeight - MARGIN),
    w: defaultWidth,
    h: defaultHeight,
    pinned: defaultPinned,
    maximized: false,
    minimized: false,
    zoom: 1,
  };

  const [pos, setPos] = useState({ x: defaultSaved.x, y: defaultSaved.y });
  const [size, setSize] = useState({ w: defaultSaved.w, h: defaultSaved.h });
  const [zoom, setZoom] = useState(defaultSaved.zoom);
  const [pinned, setPinned] = useState(defaultSaved.pinned);
  const [maximized, setMaximized] = useState(defaultSaved.maximized);
  const [minimized, setMinimized] = useState(defaultSaved.minimized);

  useEffect(() => {
    setSize((s) => ({
      w: clamp(SHEET_MODE ? WIN_W - MARGIN * 2 : s.w, Math.min(300, WIN_W - MARGIN * 2), WIN_W - MARGIN * 2),
      h: clamp(s.h, Math.floor(WIN_H * 0.35), WIN_H - MARGIN * 2),
    }));
    setPos((p) => ({
      x: SHEET_MODE ? MARGIN : clamp(p.x, MARGIN, WIN_W - size.w - MARGIN),
      y: SHEET_MODE ? clamp(p.y, sheetSnapTop, sheetSnapLow) : clamp(p.y, topOffset, WIN_H - size.h - MARGIN),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WIN_W, WIN_H, isPortrait, topOffset, SHEET_MODE]);

  useEffect(() => {
    if (!rememberKey) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`overlay:${rememberKey}`);
        if (!raw) return;
        const o = JSON.parse(raw) as Partial<Saved>;
        const w = clamp(Number(o.w ?? defaultSaved.w), Math.min(300, WIN_W - MARGIN * 2), WIN_W - MARGIN * 2);
        const h = clamp(Number(o.h ?? defaultSaved.h), Math.floor(WIN_H * 0.35), WIN_H - MARGIN * 2);
        setSize({ w: SHEET_MODE ? WIN_W - MARGIN * 2 : w, h });
        setPos({
          x: SHEET_MODE ? MARGIN : clamp(Number(o.x ?? defaultSaved.x), MARGIN, Math.max(MARGIN, WIN_W - w - MARGIN)),
          y: SHEET_MODE
            ? clamp(Number(o.y ?? defaultSaved.y), sheetSnapTop, sheetSnapLow)
            : clamp(Number(o.y ?? defaultSaved.y), topOffset, Math.max(MARGIN, WIN_H - h - MARGIN)),
        });
        setZoom(Number.isFinite(o.zoom || 0) ? Number(o.zoom) : defaultSaved.zoom);
        setPinned(!!o.pinned);
        setMaximized(!!o.maximized);
        setMinimized(!!o.minimized);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rememberKey, WIN_W, WIN_H, topOffset, SHEET_MODE]);

  useEffect(() => {
    if (!rememberKey) return;
    const payload: Saved = { x: pos.x, y: pos.y, w: size.w, h: size.h, pinned, maximized, minimized, zoom };
    AsyncStorage.setItem(`overlay:${rememberKey}`, JSON.stringify(payload)).catch(() => {});
  }, [rememberKey, pos, size, pinned, maximized, minimized, zoom]);

  /* 4) Visibility timing */
  const [activeIdx, setActiveIdx] = useState(-1);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  useEffect(() => {
    if (latestIdx >= 0 && latestIdx !== activeIdx) {
      setActiveIdx(latestIdx);
      setLastSeenAt(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestIdx]);

  const itemsAtActiveSentence = useMemo(() => {
    if (activeIdx < 0) return [] as OverlayItem[];
    const at = items[activeIdx]?.at;
    return items.filter((it) => it.at === at);
  }, [activeIdx, items]);

  const currentGroupSig = useMemo(() => groupSignature(itemsAtActiveSentence), [itemsAtActiveSentence]);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (minimized || activeIdx < 0) return false;
    if (dismissedSig && currentGroupSig === dismissedSig) return false;
    if (pinned || maximized) return true;
    const activeItem = items[activeIdx];
    const justTriggeredOrCurrent = !!activeItem && activeItem.at === currentSentenceIndex;
    if (justTriggeredOrCurrent) return true;
    return Date.now() - lastSeenAt < lingerMs;
  }, [minimized, activeIdx, dismissedSig, currentGroupSig, pinned, maximized, items, currentSentenceIndex, lastSeenAt, lingerMs]);

  /* 5) Drag (PanResponder) — sheet snaps on release in SHEET_MODE */
  const panRef = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !maximized,
      onPanResponderMove: (_evt, g) => {
        if (maximized) return;
        if (SHEET_MODE) {
          setPos(() => ({ x: MARGIN, y: clamp(defaultSaved.y + g.dy, sheetSnapTop, sheetSnapLow) }));
        } else {
          const loX = MARGIN, hiX = WIN_W - size.w - MARGIN;
          const loY = freeMove ? MARGIN : (topOffset || 0);
          const hiY = WIN_H - size.h - MARGIN;
          setPos((p) => ({ x: clamp(p.x + g.dx, loX, Math.max(loX, hiX)), y: clamp(p.y + g.dy, loY, Math.max(loY, hiY)) }));
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (!SHEET_MODE || maximized) return;
        const candidates: [number, number, number] = [sheetSnapTop, sheetSnapMid, sheetSnapLow];
        const target = defaultSaved.y + g.dy;
        const dest = candidates.reduce<number>(
          (best, y) => (Math.abs(target - y) < Math.abs(target - best) ? y : best),
          candidates[0]
        );
        setPos({ x: MARGIN, y: dest });
      },
    })
  );

  /* 6) Zoom helpers */
  const zoomOut   = () => setZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)));
  const zoomIn    = () => setZoom((z) => Math.min(1.8,  +(z + 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  // ── Single top-level Modal so overlay sits above the whole screen
  const showChip    = minimized;
  const showOverlay = visible && itemsAtActiveSentence.length > 0;
  const showMaxFull = maximized && fullOnMaximize;
  const showModal   = showChip || showOverlay || showMaxFull;

  if (!showModal) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="none"
      visible={showModal}
      onRequestClose={() => {
        if (showMaxFull) setMaximized(false);
        else if (showOverlay) setMinimized(true);
      }}
    >
      {/* Let touches pass except where we render content */}
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        {/* Minimized chip (bottom-right) */}
        {showChip && (
          <View pointerEvents="box-none" style={[{ position: 'absolute', right: MARGIN, bottom: MARGIN, zIndex }]}>
            <TouchableOpacity
              onPress={() => setMinimized(false)}
              style={[tw`px-3 py-2 rounded-full`, { backgroundColor: 'rgba(2,6,23,0.75)' }]}
              accessibilityRole="button"
              accessibilityLabel="Show notes"
            >
              <Text style={tw`text-white text-xs font-semibold`}>Notes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Full-screen maximize inside the same Modal */}
        {showMaxFull ? (
          <View style={[tw`flex-1`, { backgroundColor: 'rgba(2,6,23,0.85)', paddingTop: 10 }]}>
            <View style={tw`flex-1`}>
              {/* Header */}
              <View
                style={[
                  tw`flex-row items-center px-2 py-2`,
                  { minHeight: HEADER_H, backgroundColor: 'rgba(15,23,42,0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <View style={[tw`rounded-full mx-1`, { width: 44, height: 4, backgroundColor: 'rgba(148,163,184,0.5)' }]} />
                <Text numberOfLines={1} style={[tw`text-slate-200 font-bold text-sm ml-2`, { maxWidth: WIN_W * 0.42 }]}>
                  {lesson?.title || 'Lesson notes'}
                </Text>
                <View style={tw`ml-auto`}>
                  {/* Controls */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row items-center`} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity onPress={() => setZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)))} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>−</Text></TouchableOpacity>
                    <Text style={tw`text-slate-200 text-xs mx-1`}>{Math.round(zoom * 100)}%</Text>
                    <TouchableOpacity onPress={() => setZoom((z) => Math.min(1.8,  +(z + 0.1).toFixed(2)))} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>+</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setZoom(1)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>Reset</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setPinned((p) => !p)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>{pinned ? 'Unpin' : 'Pin'}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setMaximized(false)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>Restore</Text></TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setPinned(false);
                        setMaximized(false);
                        setMinimized(false);
                        setDismissedSig(currentGroupSig || '');
                      }}
                      style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}
                    >
                      <Text style={tw`text-slate-100 text-xs font-semibold`}>✕</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>

              {/* Content */}
              <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-3 pb-6`}>
                {itemsAtActiveSentence.map((it) => (
                  <View
                    key={it.key}
                    style={[
                      tw`rounded-2xl p-3 mb-2`,
                      {
                        backgroundColor: 'rgba(2,6,23,0.7)',
                        borderWidth: 1,
                        borderColor: 'rgba(148,163,184,0.18)',
                        shadowColor: '#000',
                        shadowOpacity: 0.45,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 10,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-white font-bold text-[10px]`,
                        {
                          position: 'absolute',
                          left: 12,
                          top: -10,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: '#8b5cf6',
                        },
                      ]}
                    >
                      {KIND_LABEL[it.kind]}
                    </Text>

                    <Markdown
                      markdownStyle={{
                        body:       { fontSize: Math.max(12, (SMALL_PHONE ? 13 : 14) * zoom), lineHeight: Math.max(18, (SMALL_PHONE ? 20 : 22) * zoom), color: '#e5e7eb' },
                        heading1:   { fontSize: Math.max(16, (SMALL_PHONE ? 18 : 20) * zoom), marginBottom: 6, color: '#fff' },
                        heading2:   { fontSize: Math.max(15, (SMALL_PHONE ? 17 : 18) * zoom), marginBottom: 6, color: '#fff' },
                        heading3:   { fontSize: Math.max(14, (SMALL_PHONE ? 16 : 16) * zoom), marginBottom: 6, color: '#fff' },
                        code_block: { fontSize: Math.max(11, 13 * zoom), backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 12 },
                        fence:      { fontSize: Math.max(11, 13 * zoom), backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 12 },
                        image:      { borderRadius: 12, marginVertical: 6, maxWidth: WIN_W - 24 },
                      }}
                    >
                      {it.md}
                    </Markdown>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {/* Floating draggable / sheet card (non-max) */}
        {showOverlay && !showMaxFull && (
          <View
            pointerEvents="box-none"
            style={[{ position: 'absolute', left: pos.x, top: pos.y, zIndex }]}
          >
            <View
              style={[
                tw`overflow-hidden rounded-2xl`,
                {
                  width: size.w,
                  height: size.h,
                  maxWidth: WIN_W - MARGIN * 2,
                  maxHeight: WIN_H - MARGIN * 2,
                  backgroundColor: 'rgba(15,23,42,0.9)',
                  borderWidth: 1,
                  borderColor: '#1f2a37',
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 12,
                },
              ]}
            >
              {/* Drag header */}
              <View
                {...(panRef.current?.panHandlers ?? {})}
                style={[
                  tw`flex-row items-center px-2`,
                  {
                    minHeight: HEADER_H,
                    backgroundColor: 'rgba(15,23,42,0.88)',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                {/* Grab handle */}
                <View style={[tw`rounded-full`, { width: 42, height: 4, backgroundColor: 'rgba(148,163,184,0.45)', marginRight: 8 }]} />
                <Text numberOfLines={1} style={[tw`text-slate-200 font-bold text-sm`, { maxWidth: Math.floor(size.w * 0.42) }]}>
                  {lesson?.title || 'Lesson notes'}
                </Text>

                {/* Controls */}
                <View style={tw`ml-auto max-w-[60%]`}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row items-center`} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity onPress={() => setZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)))} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>−</Text></TouchableOpacity>
                    <Text style={tw`text-slate-200 text-xs mx-1`}>{Math.round(zoom * 100)}%</Text>
                    <TouchableOpacity onPress={() => setZoom((z) => Math.min(1.8,  +(z + 0.1).toFixed(2)))} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>+</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setZoom(1)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>Reset</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setPinned((p) => !p)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>{pinned ? 'Unpin' : 'Pin'}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setMinimized(true)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>Min</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setMaximized(true)} style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}><Text style={tw`text-slate-100 text-xs font-semibold`}>Max</Text></TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setPinned(false);
                        setMaximized(false);
                        setMinimized(false);
                        setDismissedSig(currentGroupSig || '');
                      }}
                      style={tw`px-2.5 py-1.5 rounded-xl ml-1 bg-black/70 border border-slate-400/20`}
                    >
                      <Text style={tw`text-slate-100 text-xs font-semibold`}>✕</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>

              {/* Content */}
              <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-2.5 pb-4`} keyboardShouldPersistTaps="handled">
                {itemsAtActiveSentence.map((it) => (
                  <View
                    key={it.key}
                    style={[
                      tw`rounded-2xl p-3 mb-2`,
                      { backgroundColor: 'rgba(2,6,23,0.7)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)' },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-white font-bold text-[10px]`,
                        {
                          position: 'absolute',
                          left: 12,
                          top: -10,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: '#8b5cf6',
                        },
                      ]}
                    >
                      {KIND_LABEL[it.kind]}
                    </Text>

                    <Markdown
                      markdownStyle={{
                        body:       { fontSize: Math.max(12, (SMALL_PHONE ? 13 : 14) * zoom), lineHeight: Math.max(18, (SMALL_PHONE ? 20 : 22) * zoom), color: '#e5e7eb' },
                        heading1:   { fontSize: Math.max(16, (SMALL_PHONE ? 18 : 20) * zoom), marginBottom: 6, color: '#fff' },
                        heading2:   { fontSize: Math.max(15, (SMALL_PHONE ? 17 : 18) * zoom), marginBottom: 6, color: '#fff' },
                        heading3:   { fontSize: Math.max(14, (SMALL_PHONE ? 16 : 16) * zoom), marginBottom: 6, color: '#fff' },
                        code_block: { fontSize: Math.max(11, 13 * zoom), backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 12 },
                        fence:      { fontSize: Math.max(11, 13 * zoom), backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 12 },
                        image:      { borderRadius: 12, marginVertical: 6, maxWidth: size.w - 24 },
                      }}
                    >
                      {it.md}
                    </Markdown>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default LessonOverlayNative;
