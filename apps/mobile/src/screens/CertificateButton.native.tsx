// apps/mobile/src/screens/CertificateButton.native.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCertificate } from '@mytutorapp/shared/hooks'; // singular
import { getCertificateDownloadUrl, downloadCertificateFile } from '@mytutorapp/shared/api';

/**
 * Mirrors the web CertificateButton logic with RN screens.
 * - If logged in (token present) → use secure API download.
 * - If logged out → open the public download URL in the browser.
 * - “Verify” opens /verify/:id on the web.
 */
const CertificateButton: React.FC<{ courseId: string; justPassed?: boolean }> = ({ courseId, justPassed }) => {
  const { backendUrl, token } = useShopContext();

  const {
    eligible,
    eligibilityReason,
    certificate,
    loading,
    error,
    generate,
    refetch,
  } = useCertificate({ backendUrl, token, courseId, justPassed });

  const [downloading, setDownloading] = useState(false);

  const filename = useMemo(() => {
    const anyCert = certificate as any;
    const raw =
      anyCert?.filename ||
      anyCert?.course_title ||
      anyCert?.course?.title ||
      `certificate-${anyCert?.id ?? courseId}`;
    const clean = String(raw).replace(/[^\w\s.-]+/g, '').replace(/\s+/g, '-').toLowerCase();
    return `${clean}.pdf`;
  }, [certificate, courseId]);

  const downloadHref = useMemo(() => {
    if (!certificate) return null;
    const id = (certificate as any).id;
    return id ? getCertificateDownloadUrl(backendUrl, id) : null;
  }, [certificate, backendUrl]);

  const onSecureDownload = useCallback(async () => {
    if (!certificate || downloading) return;
    const id = (certificate as any).id as string;
    try {
      setDownloading(true);
      await downloadCertificateFile(backendUrl, token ?? '', id, filename);
      // If your download function returns a local path, you could open it here with a viewer
      // or show a toast saying "Saved to Downloads".
    } catch (e: any) {
      console.error('[cert-btn(native)] download error', e);
      Alert.alert('Download failed', e?.message || 'Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  }, [backendUrl, token, certificate, downloading, filename]);

  const openExternal = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Cannot open link', url);
    } catch (e: any) {
      Alert.alert('Cannot open link', e?.message || 'Unknown error');
    }
  }, []);

  if (certificate) {
    return (
      <View style={{ gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            if (token) onSecureDownload();
            else openExternal(downloadHref);
          }}
          disabled={downloading}
          style={{
            backgroundColor: '#16a34a',
            opacity: downloading ? 0.7 : 1,
            paddingHorizontal: 16,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {downloading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600' }}>Downloading…</Text>
            </View>
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600' }}>Download Certificate</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => openExternal(`${backendUrl.replace(/\/+$/, '')}/verify/${(certificate as any).id}`)}
          style={{
            backgroundColor: '#e7edf4',
            paddingHorizontal: 16,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#0d141c', fontWeight: '600' }}>Verify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={!eligible || loading}
        onPress={() => generate().catch(() => {})}
        style={{
          backgroundColor: eligible ? '#2563eb' : '#e5e7eb',
          paddingHorizontal: 16,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={eligible ? '#fff' : '#6b7280'} />
            <Text style={{ color: eligible ? '#fff' : '#6b7280', fontWeight: '600' }}>Generating…</Text>
          </View>
        ) : (
          <Text style={{ color: eligible ? '#fff' : '#6b7280', fontWeight: '600' }}>
            Generate Certificate
          </Text>
        )}
      </TouchableOpacity>

      {!eligible && !!eligibilityReason && (
        <Text style={{ fontSize: 14, color: '#49739c' }}>{eligibilityReason}</Text>
      )}
      {!!error && <Text style={{ fontSize: 14, color: '#ef4444' }}>{error}</Text>}
    </View>
  );
};

export default CertificateButton;
