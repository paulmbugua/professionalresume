import React from 'react';
import { View, Text, Button, Linking, ActivityIndicator } from 'react-native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCertificate } from '@mytutorapp/shared/hooks/useCertificates';

const CertificateButton: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { backendUrl, token } = useShopContext();
  const { eligible, eligibilityReason, certificate, loading, error, generate } =
    useCertificate({ backendUrl, token, courseId });

  if (certificate) {
    return (
      <Button title="Download Certificate" onPress={() => Linking.openURL(certificate.url)} />
    );
  }

  return (
    <View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Generate Certificate" onPress={() => generate().catch(() => {})} disabled={!eligible} />
      )}
      {!eligible && !!eligibilityReason && (
        <Text style={{ color: '#6b7280', marginTop: 6 }}>{eligibilityReason}</Text>
      )}
      {!!error && <Text style={{ color: 'red', marginTop: 6 }}>{error}</Text>}
    </View>
  );
};

export default CertificateButton;
