import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../navigation/types';

import { useShopContext } from '@mytutorapp/shared/context';
import { useAICertificates } from '@mytutorapp/shared/hooks';

// Native payment slide-over/panel (implement this in your native screens folder)
import PaymentWidget from './PaymentWidget.native';

type GradeLike = {
  scorePct: number;
  passMark: number;
  passed: boolean;
};

type Nav = StackNavigationProp<MainStackParamList>;

type DocRow = {
  id: string;
  url: string;
  download_url?: string;
};

type AICertificateSKU = {
  code: string;
  title: string;
  price_tokens: number | string;
};

function WatermarkPreview({
  title,
  pdfUrl,
  certId,
  backendUrl,
  folderHint = 'certificates',
}: {
  title: string;
  pdfUrl?: string | null;
  certId?: string | null;
  backendUrl?: string;
  folderHint?: 'certificates' | 'transcripts';
}) {
  const previewUrl = useMemo(() => {
    // Prefer server-rendered OG previews when we have an id + backend
    if (certId && backendUrl) {
      const base = backendUrl.replace(/\/+$/, '');
      if (folderHint === 'certificates') return `${base}/api/certificates/${certId}/og`;
      if (folderHint === 'transcripts') return `${base}/api/transcripts/${certId}/og`;
    }
    // Fallback: derive first-page JPG from a public/watermarked PDF
    if (!pdfUrl) return null;
    try {
      const u = new URL(pdfUrl);
      const [left, right] = u.pathname.split('/upload/');
      if (!right) return null;
      return `${u.origin}${left}/upload/pg_1/${right.replace(/\.pdf$/i, '.jpg')}`;
    } catch {
      return null;
    }
  }, [certId, backendUrl, pdfUrl, folderHint]);

  return (
    <View className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10">
      <View className="px-3 pt-3">
        <Text className="text-white font-semibold">{title}</Text>
        <Text className="text-white/60 text-xs mb-2">Preview (watermarked)</Text>
      </View>

      <View className="relative">
        <View className="aspect-[4/3] bg-black/30 items-center justify-center">
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              accessibilityLabel={`${title} preview`}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-white/60 text-sm">No preview available</Text>
          )}
        </View>

        {/* Watermark overlay */}
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{ mixBlendMode: 'multiply' } as any}
        >
          <Text className="text-white/20 font-black tracking-widest text-4xl">
            PREVIEW
          </Text>
        </View>
      </View>

      <View className="px-3 pb-3">
        <Text className="text-white/60 text-xs">
          Downloads are clean (no watermark) after payment or token claim.
        </Text>
      </View>
    </View>
  );
}

const ResultsPage: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { backendUrl, token } = useShopContext();

  // Safely read params (route.params itself can be undefined)
  const courseId: string | undefined = route?.params?.courseId;
  const courseTitle: string | undefined = route?.params?.courseTitle;
  const grade: GradeLike | undefined = route?.params?.grade;

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cert, setCert] = useState<DocRow | null>(null);
  const [trans, setTrans] = useState<DocRow | null>(null);

  // Helper to call API
  async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (r.status === 204) return null as any;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e: any = new Error(data?.error || `Request failed: ${r.status}`);
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  // Attempt to fetch existing cert/transcript (backend may return existing on "generate" POST)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!courseId) return;

      try {
        const c = await api(`/api/certificates/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        }).catch((e: any) => {
          if (e?.status === 402) return null; // payment required
          throw e;
        });
        if (!abort && c?.id) setCert({ id: c.id, url: c.url, download_url: c.download_url });
      } catch {}

      try {
        const t = await api(`/api/transcripts/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        }).catch((e: any) => {
          if (e?.status === 402) return null;
          throw e;
        });
        if (!abort && t?.id) setTrans({ id: t.id, url: t.url, download_url: t.download_url });
      } catch {}
    })();
    return () => {
      abort = true;
    };
  }, [backendUrl, token, courseId]);

  const passed = Boolean(grade?.passed);

  // Tokens-first hook (AI certificates)
  const { skus, loading: aiCertLoading, error: aiCertError, message: aiCertMsg, claim, generate } =
    useAICertificates({ backendUrl, token: token || '', courseId });

  // Narrow/normalize SKUs to avoid "possibly undefined" in map indices/props
  const typedSkus: AICertificateSKU[] = useMemo(
    () => (skus ?? []).filter(Boolean).map((s: any) => ({
      code: String(s?.code ?? ''),
      title: String(s?.title ?? ''),
      price_tokens: s?.price_tokens ?? 0,
    })),
    [skus]
  );

  const openExternal = async (url?: string) => {
    if (!url) {
      setPaymentOpen(true);
      return;
    }
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else setPaymentOpen(true);
    } catch {
      setPaymentOpen(true);
    }
  };

  return (
    <View className="flex-1 bg-[#0b1220]">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-3 py-4">
        <View className="max-w-[1100px] w-full self-center space-y-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-white font-bold text-xl">Results & Documents</Text>
              <Text className="text-white/70 text-sm">
                {courseTitle ? <Text className="font-medium">{courseTitle}</Text> : 'Course'} • Your quiz results & downloads
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              className="rounded-xl px-3 py-2 bg-white/10"
            >
              <Text className="text-white text-sm">Back</Text>
            </Pressable>
          </View>

          {/* Score card */}
          <View
            className={`rounded-2xl p-4 ${passed ? 'bg-emerald-500/10' : 'bg-red-500/10'} ${passed ? 'ring-emerald-500/40' : 'ring-red-500/40'} ring-1`}
          >
            <Text className="text-white/80 text-sm">Score</Text>
            <Text className="text-2xl font-semibold text-white">
              {typeof grade?.scorePct === 'number' ? `${grade.scorePct}%` : '—'}
              <Text className="text-white/60 text-sm">  (Pass mark {typeof grade?.passMark === 'number' ? grade.passMark : 70}%)</Text>
            </Text>
            <Text className="mt-1 text-white/70">
              {passed ? 'Nice! You passed. You can unlock clean downloads.' : 'Review the lesson and try again to pass.'}
            </Text>
          </View>

          {/* Previews */}
          <View className="gap-4">
            <WatermarkPreview
              title="Certificate"
              pdfUrl={cert?.url || null}
              certId={cert?.id || null}
              backendUrl={backendUrl}
              folderHint="certificates"
            />
            <WatermarkPreview
              title="Transcript"
              pdfUrl={trans?.url || null}
              certId={trans?.id || null}
              backendUrl={backendUrl}
              folderHint="transcripts"
            />
          </View>

          {/* Actions */}
          <View className="rounded-2xl p-4 border border-white/10 bg-white/5">
            <Text className="text-white font-semibold mb-2">Downloads</Text>
            <Text className="text-white/70 text-sm mb-3">
              Claim with tokens or pay once with fiat to unlock clean downloads.
            </Text>

            {/* Tokens-first block */}
            <View className="mb-4 p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <Text className="text-white font-medium text-sm">Claim with Tokens</Text>
              <Text className="text-white/70 text-xs mb-2">No processor fees for AI certificates.</Text>

              {aiCertLoading ? <Text className="text-xs text-white/60">Loading certificate options…</Text> : null}
              {aiCertError ? <Text className="text-xs text-red-300">{aiCertError}</Text> : null}
              {aiCertMsg ? <Text className="text-xs text-emerald-300">{aiCertMsg}</Text> : null}

              <View className="gap-2 mt-2">
                {typedSkus.map((sku) => {
                  // Guard against undefined code/title just in case
                  const code = sku.code || '';
                  const title = sku.title || 'Certificate';
                  const priceNum = Number(sku.price_tokens) || 0;

                  return (
                    <View
                      key={code}
                      className="flex-row items-center justify-between rounded-lg p-2 bg-white/5 ring-1 ring-white/15"
                    >
                      <View>
                        <Text className="text-sm font-medium text-white">{title}</Text>
                        <Text className="text-[11px] text-white/60">{code}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-semibold text-white">{priceNum} Tokens</Text>
                        <Pressable
                          disabled={!passed || !code}
                          onPress={async () => {
                            if (!token || !passed || !code) return;
                            try {
                              await claim(code);
                              const doc: any = await generate();
                              if (doc?.id) {
                                setCert({ id: String(doc.id), url: String(doc.url), download_url: doc.download_url });
                              }
                            } catch (e) {
                              console.error('[Results] token claim/generate failed', e);
                            }
                          }}
                          className={`px-3 py-1.5 rounded ${passed && code ? 'bg-emerald-600' : 'bg-emerald-600/50'}`}
                        >
                          <Text className="text-white text-sm">Claim & Generate</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => setPaymentOpen(true)}
                disabled={!passed}
                className={`h-10 px-4 rounded-lg justify-center ${passed ? 'bg-indigo-600' : 'bg-indigo-600/40'}`}
              >
                <Text className="text-white text-sm font-semibold">Pay certificate fee</Text>
              </Pressable>

              <Pressable
                onPress={() => openExternal(cert?.download_url)}
                className={`h-10 px-4 rounded-lg justify-center ${cert?.download_url ? 'bg-white/10' : 'bg-white/5'} ring-1 ${cert?.download_url ? 'ring-white/20' : 'ring-white/10'}`}
              >
                <Text className="text-white text-sm font-semibold">Download Certificate (PDF)</Text>
              </Pressable>

              <Pressable
                onPress={() => openExternal(trans?.download_url)}
                className={`h-10 px-4 rounded-lg justify-center ${trans?.download_url ? 'bg-white/10' : 'bg-white/5'} ring-1 ${trans?.download_url ? 'ring-white/20' : 'ring-white/10'}`}
              >
                <Text className="text-white text-sm font-semibold">Download Transcript (PDF)</Text>
              </Pressable>
            </View>

            {!passed && (
              <Text className="mt-3 text-[12px] text-white/60">
                Tip: Revisit the lesson and retry the quiz to reach the pass mark.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Payment slide-over (native) */}
      <PaymentWidget
        isOpen={paymentOpen}
        onClose={async () => {
          setPaymentOpen(false);
          if (!courseId) return;

          try {
            const c = await fetch(`${backendUrl}/api/certificates/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ courseId }),
            }).then(r => (r.ok ? r.json() : null));
            if (c?.id) setCert({ id: c.id, url: c.url, download_url: c.download_url });
          } catch {}

          try {
            const t = await fetch(`${backendUrl}/api/transcripts/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ courseId }),
            }).then(r => (r.ok ? r.json() : null));
            if (t?.id) setTrans({ id: t.id, url: t.url, download_url: t.download_url });
          } catch {}
        }}
        title="Unlock Certificate"
        showTutorPreview={false}
      />
    </View>
  );
};

export default ResultsPage;
