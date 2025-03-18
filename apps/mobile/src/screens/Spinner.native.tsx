// /apps/mobile/src/screens/Spinner.native.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Spinner = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#A259FF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Spinner;
