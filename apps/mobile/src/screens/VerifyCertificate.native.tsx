import React from 'react';
import { View, Text, Button, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useVerifyCertificate } from '@mytutorapp/shared/hooks/useVerifyCertificate';
import { useShopContext } from '@mytutorapp/shared/context';

type RouteParams = { VerifyCertificate: { id: string } };

const VerifyCertificateScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'VerifyCertificate'>>();
  const id = route.params?.id;
  const { backendUrl } = useShopContext();

  const { data, loading, error } = useVerifyCertificate({ backendUrl, certificateId: id });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Certificate</Text>

      {loading && <ActivityIndicator />}

      {!loading && error && (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Verification Error</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      )}

      {!loading && data && (
        data.valid ? (
          <View style={styles.card}>
            <Text style={styles.valid}>✓ Valid Certificate</Text>
            <Row label="Certificate ID" value={data.certificate?.id} />
            <Row label="Student" value={data.certificate?.student_name} />
            <Row label="Course" value={data.certificate?.course_title} />
            <Row label="Issued At" value={new Date(data.certificate!.issued_at).toLocaleString()} />
            {!!data.certificate?.url && (
              <Button title="View / Download PDF" onPress={() => Linking.openURL(data.certificate!.url)} />
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Invalid Certificate</Text>
            <Text style={styles.muted}>{data.error || 'No matching certificate found.'}</Text>
          </View>
        )
      )}
    </View>
  );
};

const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.muted}>{label}</Text>
    <Text style={styles.value}>{value ?? '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderColor: '#e5e7eb', borderWidth: 1, gap: 8 },
  valid: { color: '#15803d', fontWeight: '700', marginBottom: 8 },
  errorTitle: { color: '#dc2626', fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#64748b' },
  value: { color: '#0f172a', fontWeight: '600' },
});

export default VerifyCertificateScreen;
