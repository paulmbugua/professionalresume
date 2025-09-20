// apps/mobile/src/screens/LessonOverlay.native.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  PanResponderInstance,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../tailwind'; // adjust the path to your Tailwind helper
import Markdown from '../screens/Markdown.native'; // <- your RN markdown wrapper

/* ── Types (mirrors web) ───────────────────────────────── */
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

  topOffset?: number;          // header offset
  lingerMs?: number;           // auto-hide delay when not pinned
  defaultPinned?: boolean;
  rememberKey?: string;        // persistence key
  zIndex?: number;             // overlay z-order
  freeMove?: boolean;          // allow dragging to top edge
  fullOnMaximize?: boolean;    // use full-screen modal on maximize
}

/* ── Helpers ───────────────────────────────────────────── */
type OverlayItem =
  | { kind: 'formula'; at: number; key: string; md: string; title?: string; speakAs?: string }
  | { kind: 'table';   at: number; key: string; md: string; title?: string }
  | { kind: 'image';   at: number; key: string; md: string; title?: string }
  | { kind: 'snippet'; at: number; key: string; md: string; title?: string; language?: string }
  | { kind: 'chart';   at: number; key: string; md: string; title?: string };

const SENTENCE_END = /[.!?…]+["')\]]?$/;
const groupSignature = (arr: OverlayItem[]) =>
  arr.map((it) => `${it.key}:${it.md.length}`).sort().join('|');

function renderGfmTable(t: {
  title?: string;
  caption?: string;
  columns: string[];
  rows: (string | number | boolean)[][];
}) {
  const head = `| ${t.columns.join(' | ')} |\n| ${t.columns.map(() => '---').join(' | ')} |`;
  const body = (t.rows || [])
    .map((r) => `| ${r.map((x) => String(x)).join(' | ')} |`)
    .join('\n');
  return `\n**${t.title || 'Table'}**${t.caption ? ` — _${t.caption}_` : ''}\n\n${head}\n${body}\n`;
}

const KIND_LABEL: Record<OverlayItem['kind'], string> = {
  formula: 'Formula',
  table: 'Table',
  image: 'Illustration',
  snippet: 'Code',
  chart: 'Chart',
};

const { width: VW, height: VH } = Dimensions.get('window');
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ── Component ─────────────────────────────────────────── */
const LessonOverlayNative: React.FC<LessonOverlayProps> = ({
  words,
  currentIndex,
  lesson,
  topOffset = 56,
  lingerMs = 6000,
  defaultPinned = true,
  rememberKey,
  zIndex = 10000,
  freeMove = true,
  fullOnMaximize = true,
}) => {
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

  /* 2) Build items tied to sentences (ported from web) */
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
        // RN: show math in fenced block (or your Markdown can render real LaTeX if enabled)
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
        const label =
          ch.title ??
          (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Chart');
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

    // Fallbacks
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

  /* 3) Position/size/persistence (Tailwind-only UI; inline numbers for coords) */
  type Saved = {
    x: number; y: number; w: number; h: number;
    pinned: boolean; maximized: boolean; minimized: boolean; zoom: number;
  };

  const defaultSaved: Saved = {
    x: 12,
    y: (topOffset || 0) + 12,
    w: Math.min(540, VW - 16),
    h: Math.min(400, VH - 16),
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
    if (!rememberKey) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`overlay:${rememberKey}`);
        if (!raw) return;
        const o = JSON.parse(raw) as Partial<Saved>;
        setPos({
          x: clamp(Number(o.x ?? defaultSaved.x), 8, Math.max(8, VW - (o.w ?? defaultSaved.w) - 8)),
          y: clamp(Number(o.y ?? defaultSaved.y), topOffset, Math.max(8, VH - (o.h ?? defaultSaved.h) - 8)),
        });
        setSize({
          w: clamp(Number(o.w ?? defaultSaved.w), 320, Math.min(1400, VW - 16)),
          h: clamp(Number(o.h ?? defaultSaved.h), 220, Math.min(900, VH - 16)),
        });
        setZoom(Number.isFinite(o.zoom || 0) ? Number(o.zoom) : defaultSaved.zoom);
        setPinned(!!o.pinned);
        setMaximized(!!o.maximized);
        setMinimized(!!o.minimized);
      } catch {}
    })();
  }, [rememberKey, topOffset]);

  useEffect(() => {
    if (!rememberKey) return;
    const payload: Saved = {
      x: pos.x, y: pos.y, w: size.w, h: size.h,
      pinned, maximized, minimized, zoom,
    };
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

  const group = useMemo(() => {
    if (activeIdx < 0) return [] as OverlayItem[];
    const at = items[activeIdx]?.at;
    return items.filter((it) => it.at === at);
  }, [activeIdx, items]);

  const currentGroupSig = useMemo(() => groupSignature(group), [group]);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  const visible = useMemo(() => {
  if (minimized || activeIdx < 0) return false;
  if (dismissedSig && currentGroupSig === dismissedSig) return false;
  if (pinned || maximized) return true;

  const activeItem = items[activeIdx];
  const justTriggeredOrCurrent =
    !!activeItem && activeItem.at === currentSentenceIndex;

  if (justTriggeredOrCurrent) return true;
  return Date.now() - lastSeenAt < lingerMs;
}, [
  minimized,
  activeIdx,
  dismissedSig,
  currentGroupSig,
  pinned,
  maximized,
  items,
  currentSentenceIndex,
  lastSeenAt,
  lingerMs,
]);


  /* 5) Drag (PanResponder) */
// --- pan responder ref (keep your existing code) ---
const panRef = useRef<PanResponderInstance>(
  PanResponder.create({
    onStartShouldSetPanResponder: () => !maximized,
    onPanResponderMove: (_evt, g) => {
      if (maximized) return;
      const loX = 8, hiX = VW - size.w - 8;
      const loY = freeMove ? 8 : (topOffset || 0);
      const hiY = VH - size.h - 8;
      setPos((p) => ({
        x: clamp(p.x + g.dx, loX, Math.max(loX, hiX)),
        y: clamp(p.y + g.dy, loY, Math.max(loY, hiY)),
      }));
    },
    onPanResponderRelease: () => {},
  })
);


  /* 6) Zoom helpers */
  const zoomOut   = () => setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(2)));
  const zoomIn    = () => setZoom((z) => Math.min(2,   +(z + 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  /* 7) Minimized chip */
  if (minimized) {
    return (
      <View pointerEvents="box-none" style={[{ position: 'absolute', right: 12, bottom: 12, zIndex }]}>
        <TouchableOpacity
          onPress={() => setMinimized(false)}
          style={tw`px-3 py-2 rounded-full bg-black/60`}
          accessibilityRole="button"
          accessibilityLabel="Show notes"
        >
          <Text style={tw`text-white text-xs font-semibold`}>Notes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!group.length || !visible) return null;

  /* 8) Header controls (Tailwind-only) */
  const HeaderButtons = (
    <View style={tw`flex-row items-center flex-wrap ml-auto`}>
      {/* Zoom */}
      <View style={tw`flex-row items-center mr-1`}>
        <TouchableOpacity onPress={zoomOut} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Zoom out">
          <Text style={tw`text-white text-xs font-semibold`}>−</Text>
        </TouchableOpacity>
        <Text style={tw`text-slate-200 text-xs mx-1`}>{Math.round(zoom * 100)}%</Text>
        <TouchableOpacity onPress={zoomIn} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Zoom in">
          <Text style={tw`text-white text-xs font-semibold`}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomReset} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Reset zoom">
          <Text style={tw`text-white text-xs font-semibold`}>Reset</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setPinned((p) => !p)} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Pin">
        <Text style={tw`text-white text-xs font-semibold`}>{pinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMinimized(true)} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Minimize">
        <Text style={tw`text-white text-xs font-semibold`}>Minimize</Text>
      </TouchableOpacity>

      {maximized ? (
        <TouchableOpacity onPress={() => setMaximized(false)} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Restore">
          <Text style={tw`text-white text-xs font-semibold`}>Restore</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setMaximized(true)} style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`} accessibilityLabel="Maximize">
          <Text style={tw`text-white text-xs font-semibold`}>Maximize</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => {
          setPinned(false);
          setMaximized(false);
          setMinimized(false);
          setDismissedSig(currentGroupSig || '');
        }}
        style={tw`px-2 py-1 rounded-lg bg-slate-950/70 ml-1`}
        accessibilityLabel="Close"
      >
        <Text style={tw`text-white text-xs font-semibold`}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  /* 9) Full-screen maximize (modal) */
  if (maximized && fullOnMaximize) {
    return (
      <Modal animationType="fade" transparent visible onRequestClose={() => setMaximized(false)}>
        <View style={tw`flex-1 bg-slate-950/85`}>
          <View style={tw`flex-1`}>
            {/* Header */}
            <View
              style={[
                tw`flex-row items-center px-2 py-2 border-b border-white/10 bg-slate-950/85`,
                Platform.select({ ios: { paddingTop: 12 }, android: { paddingTop: 12 }, default: {} }) as any,
              ]}
            >
              <Text numberOfLines={1} style={tw`text-slate-200 font-bold text-sm max-w-2/5`}>
                {lesson?.title || 'Lesson notes'}
              </Text>
              {HeaderButtons}
            </View>

            {/* Content */}
            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-3`}>
              {group.map((it) => (
                <View key={it.key} style={tw`rounded-2xl p-3 mb-2 bg-slate-900/75 border border-slate-800`}>
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

                  {/* Markdown with zoom-scaled typography */}
                  <Markdown
                    markdownStyle={{
                      body:       { fontSize: 14 * zoom, lineHeight: 22 * zoom, color: '#e5e7eb' },
                      heading1:   { fontSize: 20 * zoom, marginBottom: 6, color: '#fff' },
                      heading2:   { fontSize: 18 * zoom, marginBottom: 6, color: '#fff' },
                      heading3:   { fontSize: 16 * zoom, marginBottom: 6, color: '#fff' },
                      code_block: { fontSize: 13 * zoom, backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 10 },
                      fence:      { fontSize: 13 * zoom, backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 10 },
                      image:      { borderRadius: 12, marginVertical: 6 },
                    }}
                  >
                    {it.md}
                  </Markdown>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  /* 10) Floating draggable card */
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', left: pos.x, top: pos.y, zIndex }]}>
      <View style={[tw`overflow-hidden rounded-2xl bg-[#0f1821]/90 border border-[#182430]`, { width: size.w, height: size.h }]}>
        {/* Drag header */}
   <View
  {...(panRef.current?.panHandlers ?? {})}  // <-- guard current
  style={tw`flex-row items-center px-2 py-2 border-b border-white/10 bg-slate-950/85`}
>
  <Text numberOfLines={1} style={tw`text-slate-200 font-bold text-sm max-w-2/5`}>
    {lesson?.title || 'Lesson notes'}
  </Text>
  {HeaderButtons}
</View>

        {/* Content */}
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-2.5`}>
          {group.map((it) => (
            <View key={it.key} style={tw`rounded-2xl p-3 mb-2 bg-slate-900/75 border border-slate-800`}>
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
                  body:       { fontSize: 14 * zoom, lineHeight: 22 * zoom, color: '#e5e7eb' },
                  heading1:   { fontSize: 20 * zoom, marginBottom: 6, color: '#fff' },
                  heading2:   { fontSize: 18 * zoom, marginBottom: 6, color: '#fff' },
                  heading3:   { fontSize: 16 * zoom, marginBottom: 6, color: '#fff' },
                  code_block: { fontSize: 13 * zoom, backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 10 },
                  fence:      { fontSize: 13 * zoom, backgroundColor: 'rgba(2,6,23,0.6)', padding: 10, borderRadius: 10 },
                  image:      { borderRadius: 12, marginVertical: 6 },
                }}
              >
                {it.md}
              </Markdown>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default LessonOverlayNative;
